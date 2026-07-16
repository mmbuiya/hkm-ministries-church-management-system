import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Supabase pg_graphql endpoint — same database used by the HKM CMS admin app.
// Auth uses the Supabase anon key; Row Level Security on the `members` table
// ensures unauthenticated reads are restricted to what the policies allow.
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_SUPABASE_GRAPHQL_URL || 'https://tkzxzriivbbzdvjgrdhk.supabase.co/graphql/v1',
  headers: {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

export const portalApolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
