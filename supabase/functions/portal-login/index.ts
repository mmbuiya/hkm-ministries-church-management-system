import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PBKDF2 hash function matching the frontend
async function hashPin(memberId: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltBuffer = encoder.encode(memberId);
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { membershipNumber, pin } = await req.json();

    if (!membershipNumber || !pin) {
      return new Response(JSON.stringify({ error: 'Membership Number and PIN are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize member ID
    const normalizedId = membershipNumber
      .trim()
      .toUpperCase()
      .replace(/^([A-Z]+)(\d+)$/, '$1-$2');
    const hashedPin = await hashPin(normalizedId, pin.trim());

    // Initialize Supabase client with SERVICE ROLE key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Query the member
    const { data: member, error: dbError } = await supabaseClient
      .from('members')
      .select('id, first_name, last_name, email, phone, department, status, is_portal_active')
      .eq('id', normalizedId)
      .eq('pin', hashedPin)
      .eq('is_portal_active', true)
      .single();

    if (dbError || !member) {
      return new Response(JSON.stringify({ error: 'Invalid Membership Number or PIN' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate custom JWT
    const secret = Deno.env.get('PORTAL_JWT_SECRET');
    if (!secret) throw new Error('PORTAL_JWT_SECRET is not set');

    const secretKey = new TextEncoder().encode(secret);

    // Setting role to "authenticated" matches the existing RLS policies on the members table
    const jwt = await new jose.SignJWT({
      sub: member.id,
      role: 'authenticated',
      email: member.email,
      iss: 'supabase',
      ref: 'tkzxzriivbbzdvjgrdhk',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secretKey);

    return new Response(
      JSON.stringify({
        token: jwt,
        member: {
          id: member.id,
          email: member.email || '',
          membership_number: member.id,
          full_name: `${member.first_name} ${member.last_name}`.trim(),
          phone_number: member.phone,
          department: member.department,
          status: member.status,
        },
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
