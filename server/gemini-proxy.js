/**
 * Gemini AI Proxy — Cloudflare Worker
 *
 * Deploy this to a serverless runtime so the Gemini API key
 * stays server-side and is never shipped to the browser.
 *
 * Deployment (Cloudflare Workers):
 *   wrangler deploy server/gemini-proxy.js --name hkm-gemini-proxy
 *
 * Environment variable (set via wrangler secret or dashboard):
 *   GEMINI_API_KEY=your_key_here
 *
 * Client calls:
 *   POST /generate
 *     { "prompt": "...", "systemInstruction": "...", "model": "gemini-2.0-flash" }
 *
 * Rate-limiting, auth checks, and usage logging should be
 * added here before deploying to production.
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response('Server misconfiguration: GEMINI_API_KEY not set', { status: 500 });
    }

    try {
      const { prompt, systemInstruction, model } = await request.json();
      const modelName = model || 'gemini-2.0-flash';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
