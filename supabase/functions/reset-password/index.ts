import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetCode, newPassword } = await req.json();

    if (!email || !resetCode || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email, reset code, and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find the user profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the reset code is valid and unused
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('login_codes')
      .select('*')
      .eq('user_id', profile.user_id)
      .eq('code', resetCode)
      .eq('used', false)
      .maybeSingle();

    if (codeError || !codeData) {
      console.error('Code lookup error:', codeError);
      return new Response(
        JSON.stringify({ error: 'Invalid or already used reset code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the code as used
    await supabaseAdmin
      .from('login_codes')
      .update({ used: true })
      .eq('id', codeData.id);

    console.log('Password reset successful for user:', profile.user_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in reset-password function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});