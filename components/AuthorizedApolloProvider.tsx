import React, { useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { useAuth } from '@clerk/clerk-react';

// Supabase pg_graphql endpoint
// VITE_SUPABASE_GRAPHQL_URL = https://<project-ref>.supabase.co/graphql/v1
// VITE_SUPABASE_ANON_KEY    = your supabase anon key
const httpUri = import.meta.env.VITE_SUPABASE_GRAPHQL_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase uses wss://<project-ref>.supabase.co/graphql/v1
const wsUri = httpUri.replace('https://', 'wss://').replace('http://', 'ws://');

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

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    lazy: true,
    retryAttempts: 5,
    connectionParams: async () => {
      const token = _getToken ? await _getToken() : null;
      return {
        headers: {
          apikey: anonKey,
          Authorization: token ? `Bearer ${token}` : `Bearer ${anonKey}`,
        },
      };
    },
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink),
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export const AuthorizedApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // 'supabase' is the Clerk JWT template name for Supabase integration
    setTokenProvider(() => getToken({ template: 'supabase' }));
  }, [getToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
