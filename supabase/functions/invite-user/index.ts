import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || (profile?.role !== 'admin' && profile?.role !== 'master')) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, full_name, niche, monthly_revenue, revenue_goal, ad_spend, objetivo, role: inviteRole, resend } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Invite the user via Supabase Auth
    const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name ?? '',
        niche: niche ?? '',
        role: inviteRole === 'admin' ? 'admin' : 'user',
      },
      redirectTo: 'https://viralidad-lite.vercel.app/login',
    })

    if (inviteError) {
      // User already confirmed (clicked a previous invite link) — send a recovery link instead
      const alreadyExists = inviteError.message.toLowerCase().includes('already')
      if (alreadyExists) {
        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://viralidad-lite.vercel.app/login',
        })
        if (resetError) {
          return new Response(JSON.stringify({ error: resetError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ success: true, resent: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save extra lead fields to the profile (created by the DB trigger on invite)
    // We upsert in case the trigger hasn't fired yet
    if (!resend) {
      await adminClient
        .from('profiles')
        .update({
          full_name: full_name ?? null,
          niche: niche ?? null,
          monthly_revenue: monthly_revenue ?? null,
          revenue_goal: revenue_goal ?? null,
          ad_spend: ad_spend ?? null,
          objetivo: objetivo ?? null,
          role: inviteRole === 'admin' ? 'admin' : 'user',
        })
        .eq('id', data.user.id)
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
