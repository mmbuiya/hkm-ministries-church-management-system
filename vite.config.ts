import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Only apply strict CSP in production, allow inline scripts in development for Vite/React
  const isDev = mode === 'development';
  
  // GitHub Pages deployment configuration
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
  const base = isGitHubPages ? '/hkm-ministries-church-management-system/' : './';
  
  return {
    base: base,
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      headers: {
        // Content Security Policy - relaxed for development, strict for production
        'Content-Security-Policy': [
          "default-src 'self'",
          isDev
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://www.googletagmanager.com https://accounts.google.com https://apis.google.com https://*.clerk.accounts.dev blob:"
            : "script-src 'self' https://cdn.tailwindcss.com https://www.googletagmanager.com https://accounts.google.com https://apis.google.com https://*.clerk.accounts.dev blob:",
          "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://accounts.google.com https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
          "img-src 'self' data: https: blob: https://*.clerk.accounts.dev https://img.clerk.com",
          "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://generativelanguage.googleapis.com ws://localhost:* http://localhost:* https://www.google-analytics.com https://accounts.google.com https://apis.google.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://sunny-zebra-57.hasura.app wss://sunny-zebra-57.hasura.app https://challenges.clerk.com",
          "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.clerk.accounts.dev https://challenges.clerk.com",
          "form-action 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          isDev ? "" : "upgrade-insecure-requests",
        ].filter(Boolean).join('; '),
        // Additional security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        ...(isDev ? {} : { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});
