import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const RAG_SUPABASE_URL = 'https://jlbfnwgjnsjfullwrami.supabase.co'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Regex patterns to remove video links and timestamps from responses
const VIDEO_URL_PATTERN = /https?:\/\/(www\.)?(vimeo\.com|youtu\.be|youtube\.com|tiktok\.com|vm\.tiktok\.com)[^\s\)\"\'<>]*/gi
const TIMESTAMP_PATTERN = /\b(\d{1,2}):(\d{2})(:\d{2})?\b/g
const GENERIC_TIMESTAMP_PATTERN = /min\s+\d{1,2}:\d{2}/gi

function sanitizeResponse(text: string): string {
  return text
    .replace(VIDEO_URL_PATTERN, '')
    .replace(TIMESTAMP_PATTERN, '')
    .replace(GENERIC_TIMESTAMP_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const ragAnonKey = Deno.env.get('RAG_SUPABASE_ANON_KEY')

    if (!googleApiKey) {
      console.error('GOOGLE_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'GOOGLE_API_KEY no está configurado en Supabase Vault' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!ragAnonKey) {
      console.error('RAG_SUPABASE_ANON_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'RAG_SUPABASE_ANON_KEY no está configurado en Supabase Vault' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // User client to verify auth
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get profile
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('queries_used, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check limit
    if (profile.role !== 'admin' && profile.queries_used >= 10) {
      return new Response(
        JSON.stringify({
          error: 'Límite de consultas alcanzado. Actualiza tu plan en viralidad.ai',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { query, conversation_history = [] } = await req.json()
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate embedding with gemini-embedding-2-preview (same model used to index the RAG)
    const embeddingResponse = await fetchWithTimeout(
      `${GEMINI_API_URL}/models/gemini-embedding-2-preview:embedContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2-preview',
          content: { parts: [{ text: query }] },
          outputDimensionality: 768,
        }),
      },
      15000
    )

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text()
      throw new Error(`Embedding error (${embeddingResponse.status}): ${errText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding: number[] = embeddingData.embedding?.values

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding')
    }

    // Search RAG Supabase (10s timeout via Promise.race)
    const ragClient = createClient(RAG_SUPABASE_URL, ragAnonKey)
    const ragPromise = ragClient.rpc('match_mentorias', {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 8,
    })
    const ragTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RAG search timeout')), 10000)
    )
    const { data: matches, error: ragError } = await Promise.race([ragPromise, ragTimeout]) as Awaited<typeof ragPromise>

    if (ragError) {
      console.error('RAG search error:', ragError)
    }

    // Prepare context from matches
    let contextText = ''
    const sources: Array<{ title: string; snippet: string }> = []

    if (matches && matches.length > 0) {
      matches.forEach((match: { content?: string; metadata?: { title?: string } }) => {
        const content = match.content ?? ''
        const title = match.metadata?.title ?? 'Mentoría'
        contextText += `\n---\n${content}\n`
        sources.push({
          title,
          snippet: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
        })
      })
    }

    // If no context found
    if (!contextText) {
      return new Response(
        JSON.stringify({
          answer: 'No tengo información específica sobre ese tema en las mentorías de Víctor. Te recomiendo revisar el contenido directamente en viralidad.ai para encontrar respuestas más precisas.',
          sources: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build conversation for Gemini
    const systemInstruction = `Eres Víctor, un experto en creación de contenido viral y crecimiento en redes sociales.
Respondes basándote ÚNICAMENTE en el contexto de las mentorías proporcionado.
Si la información no está en el contexto, dilo honestamente.
Responde en español de forma clara, práctica y accionable.
NO incluyas links a videos, URLs de YouTube, TikTok, Vimeo u otras plataformas de video.
NO incluyas timestamps como "min 3:45" o "2:30".
Sé directo y da valor inmediato.`

    const userMessage = `Contexto de mentorías:
${contextText}

Pregunta del usuario: ${query}`

    // Build messages for Gemini
    const geminiMessages = []

    // Add conversation history
    for (const msg of conversation_history) {
      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }

    // Add current query with context
    geminiMessages.push({
      role: 'user',
      parts: [{ text: userMessage }],
    })

    // Call Gemini with 30s timeout
    const geminiResponse = await fetchWithTimeout(
      `${GEMINI_API_URL}/models/gemini-flash-latest:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2000,
          },
        }),
      },
      30000
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      throw new Error(`Gemini error (${geminiResponse.status}): ${errText}`)
    }

    const geminiData = await geminiResponse.json()
    const rawAnswer: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    if (!rawAnswer) {
      throw new Error('No answer generated')
    }

    const answer = sanitizeResponse(rawAnswer)

    // Increment usage if not admin
    if (profile.role !== 'admin') {
      const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await adminClient.rpc('increment_usage', {
        p_user_id: user.id,
        p_field: 'queries',
      })
    }

    return new Response(
      JSON.stringify({ answer, sources }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('ask-victor error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
