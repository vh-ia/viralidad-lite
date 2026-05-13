import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

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
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiKey) {
      console.error('OPENAI_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY no está configurado en Supabase Vault' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create client with user JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get authenticated user
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
      .select('scripts_used, role, niche')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check limit (admins and master bypass)
    if (profile.role === 'user' && profile.scripts_used >= 10) {
      return new Response(
        JSON.stringify({
          error: 'Límite de guiones alcanzado. Actualiza tu plan en viralidad.ai',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { platform, niche, topic, tone, duration } = await req.json()
    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const effectiveNiche = niche || profile.niche || 'general'

    // System prompt
    const systemPrompt = `Eres un experto en creación de contenido viral para redes sociales.
Tu misión es crear guiones altamente virales y optimizados para la plataforma indicada.
Usa estructuras probadas: gancho fuerte en los primeros 3 segundos, desarrollo con valor real, CTA claro.
El guion debe estar listo para grabar, con indicaciones de tono y pausa cuando sea necesario.
Responde SOLO con el guion formateado, sin explicaciones adicionales.`

    // User prompt
    const userPrompt = `Crea un guion viral para ${platform} sobre el tema: ${topic}
Nicho: ${effectiveNiche}
Tono: ${tone}
Duración aproximada: ${duration}

Formato:
GANCHO (0-3 seg): [texto]
DESARROLLO: [texto]
CTA FINAL: [texto]

Notas de producción: [indicaciones breves de entrega/pausa]`

    // Call OpenAI with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25s timeout

    let openaiResponse: Response
    try {
      openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!openaiResponse.ok) {
      const errData = await openaiResponse.json().catch(() => ({}))
      const errMsg = errData.error?.message ?? `HTTP ${openaiResponse.status}: ${openaiResponse.statusText}`
      throw new Error(`OpenAI error: ${errMsg}`)
    }

    const openaiData = await openaiResponse.json()
    const scriptContent: string = openaiData.choices[0]?.message?.content ?? ''

    if (!scriptContent) {
      throw new Error('No content generated')
    }

    // Create admin client to bypass RLS for insert + increment
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Increment usage only for regular users
    if (profile.role === 'user') {
      await adminClient.rpc('increment_usage', {
        p_user_id: user.id,
        p_field: 'scripts',
      })
    }

    // Extract a title from the script (first line of GANCHO or first 60 chars)
    const ganchoMatch = scriptContent.match(/GANCHO[^:]*:\s*(.+)/i)
    const title = ganchoMatch
      ? ganchoMatch[1].slice(0, 80).trim()
      : scriptContent.slice(0, 60).trim()

    // Save script
    const { data: savedScript, error: saveError } = await adminClient
      .from('scripts')
      .insert({
        user_id: user.id,
        title,
        platform,
        niche: effectiveNiche,
        content: scriptContent,
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Error saving script:', saveError)
    }

    return new Response(
      JSON.stringify({ content: scriptContent, id: savedScript?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('create-script error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
