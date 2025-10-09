import { serve } from 'https://deno.land/std@0.181.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = Deno.env.get('MY_SUPABASE_URL')!
const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // Allow all origins (for testing only)
  const headers = {
    'Access-Control-Allow-Origin': '*', //'https://rbyers87.github.io' to restrict frontend access
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const body = await req.json()
    const { email, password, full_name, role, badge_number } = body

    const { user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: user.id,
        email,
        full_name,
        role,
        badge_number: badge_number || null
      }])

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ user }), { status: 200, headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
