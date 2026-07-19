import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SALT_LENGTH = 16;
const HASH_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const MIN_PASSWORD_LENGTH = 8;

interface JwtPayload {
  sub: string;
  role: string;
  email: string;
  [key: string]: unknown;
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = new Uint8Array(salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: HASH_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH,
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must contain at least one special character (@$!%*?&)';
  }
  if (password.toLowerCase().includes('password')) {
    return 'Password cannot contain the word "password"';
  }
  if (/(.)\1{2,}/.test(password)) {
    return 'Password cannot contain repeating characters';
  }
  return null;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey, {
      issuer: 'supabase',
    });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

async function generatePortalJwt(memberId: string, email: string, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return await new jose.SignJWT({
    sub: memberId,
    role: 'authenticated',
    email,
    iss: 'supabase',
    ref: 'tkzxzriivbbzdvjgrdhk',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jwtSecret = Deno.env.get('PORTAL_JWT_SECRET');
    if (!jwtSecret) throw new Error('PORTAL_JWT_SECRET is not set');

    // Authenticate via JWT (issued after PIN verification in portal-login)
    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Authorization token is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await verifyJwt(bearerToken, jwtSecret);
    if (!payload || !payload.sub) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token. Please login again.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { password } = await req.json();
    if (!password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate password strength
    const validationError = validatePasswordStrength(password);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const memberId = payload.sub;
    const email = payload.email || '';

    // Initialize Supabase client with SERVICE ROLE key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if password is already set (prevent overwrite)
    const { data: existingMember, error: lookupError } = await supabaseClient
      .from('members')
      .select('id, password_hash, is_portal_active')
      .eq('id', memberId)
      .single();

    if (lookupError || !existingMember) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingMember.password_hash) {
      return new Response(JSON.stringify({ error: 'Password is already set. Use your password to login.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existingMember.is_portal_active) {
      return new Response(JSON.stringify({ error: 'Portal access is not active for this member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash password with random salt
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const passwordHash = `${salt}:${hash}`;

    // Update member with password hash
    const { error: updateError } = await supabaseClient
      .from('members')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        must_change_password: false,
      })
      .eq('id', memberId);

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Fetch updated member info
    const { data: member } = await supabaseClient
      .from('members')
      .select('id, first_name, last_name, email, phone, department, status')
      .eq('id', memberId)
      .single();

    // Issue new JWT (without needsPasswordSetup flag)
    const newJwt = await generatePortalJwt(memberId, email, jwtSecret);

    return new Response(
      JSON.stringify({
        token: newJwt,
        member: {
          id: member?.id || memberId,
          email: member?.email || email,
          membership_number: member?.id || memberId,
          full_name: `${member?.first_name || ''} ${member?.last_name || ''}`.trim(),
          phone_number: member?.phone,
          department: member?.department,
          status: member?.status,
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
