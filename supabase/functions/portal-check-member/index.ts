import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeMemberId(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^([A-Z]+)(\d+)$/, '$1-$2');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { membershipNumber } = await req.json();

    if (!membershipNumber) {
      return new Response(JSON.stringify({ error: 'Membership Number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedId = normalizeMemberId(membershipNumber);

    // Initialize Supabase client with SERVICE ROLE key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Look up member by ID
    const { data: member, error: dbError } = await supabaseClient
      .from('members')
      .select('id, password_hash, is_portal_active')
      .eq('id', normalizedId)
      .single();

    if (dbError || !member) {
      // Member not found, just return exists: false
      return new Response(JSON.stringify({ exists: false, hasPassword: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        exists: true,
        isActive: !!member.is_portal_active,
        hasPassword: !!member.password_hash,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
