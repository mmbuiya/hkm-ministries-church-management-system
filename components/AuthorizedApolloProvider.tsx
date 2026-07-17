import React, { useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useAuth } from '@clerk/clerk-react';

// Supabase pg_graphQL endpoint
// VITE_SUPABASE_GRAPHQL_URL = https://<project-ref>.supabase.co/graphql/v1
// VITE_SUPABASE_ANON_KEY    = your supabase anon key
const httpUri = import.meta.env.VITE_SUPABASE_GRAPHQL_URL || 'https://tkzxzriivbbzdvjgrdhk.supabase.co/graphql/v1';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // Must be a valid JWT starting with eyJ...

if (!anonKey || !anonKey.startsWith('eyJ')) {
  console.warn('⚠️ Invalid or missing VITE_SUPABASE_ANON_KEY. Supabase requests will fail with 401 Unauthorized.');
}

let _getToken: (() => Promise<string | null>) | null = null;

export const setTokenProvider = (getTokenFn: () => Promise<string | null>) => {
  _getToken = getTokenFn;
};

const httpLink = createHttpLink({ uri: httpUri });

const authLink = setContext(async (_, { headers }) => {
  const token = _getToken ? await _getToken() : null;
  return {
    headers: {
      ...headers,
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: `Bearer ${anonKey}` }),
    },
  };
});

const cache = new InMemoryCache();

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
});

export const AuthorizedApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // 'supabase' is the Clerk JWT template name for Supabase integration
    setTokenProvider(() => getToken({ template: 'supabase' }));
  }, [getToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
