import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PBKDF2 hash function matching the frontend (for PIN verification)
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

// Password hash verification (uses salt:hash format from portal-set-password)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const derivedHash = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return derivedHash === hash;
}

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
    const { membershipNumber, pin, password } = await req.json();

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

    // ─── PASSWORD LOGIN ──────────────────────────────────────────
    if (password) {
      // Look up member by ID
      const { data: member, error: dbError } = await supabaseClient
        .from('members')
        .select('id, first_name, last_name, email, phone, department, status, password_hash, is_portal_active')
        .eq('id', normalizedId)
        .single();

      if (dbError || !member) {
        return new Response(JSON.stringify({ error: 'Invalid Membership Number or Password' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!member.is_portal_active) {
        return new Response(
          JSON.stringify({ error: 'Portal access is not active. Please contact the church office.' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (!member.password_hash) {
        return new Response(JSON.stringify({ error: 'No password set. Please login with your PIN first.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValid = await verifyPassword(password, member.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid Membership Number or Password' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate JWT
      const secret = Deno.env.get('PORTAL_JWT_SECRET');
      if (!secret) throw new Error('PORTAL_JWT_SECRET is not set');

      const secretKey = new TextEncoder().encode(secret);
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
    }

    // ─── PIN LOGIN ──────────────────────────────────────────────
    if (!pin) {
      return new Response(JSON.stringify({ error: 'PIN or Password is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hashedPin = await hashPin(normalizedId, pin.trim());

    // Query the member with PIN hash
    const { data: member, error: dbError } = await supabaseClient
      .from('members')
      .select('id, first_name, last_name, email, phone, department, status, password_hash, is_portal_active')
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

    // Check if password is already set — if so, tell user to use password
    if (member.password_hash) {
      return new Response(
        JSON.stringify({
          error: 'A password is already set for this account. Please login with your password instead.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Generate JWT
    const secret = Deno.env.get('PORTAL_JWT_SECRET');
    if (!secret) throw new Error('PORTAL_JWT_SECRET is not set');

    const secretKey = new TextEncoder().encode(secret);
    const needsPasswordSetup = true;

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
        needsPasswordSetup,
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
