// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const { email, password, full_name, role, badge_number } = body;

    // Create user with email confirmed
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

    // Insert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: data.user.id,
        full_name,
        role,
        badge_number: badge_number || null,
        email
      }]);

    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });

    return new Response(JSON.stringify({ user: data.user }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

