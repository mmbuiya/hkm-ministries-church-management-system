import React, { useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { useAuth } from '@clerk/clerk-react';

const httpUri = import.meta.env.VITE_HASURA_GRAPHQL_URL || 'https://sunny-zebra-57.hasura.app/v1/graphql';
const wsUri = httpUri.replace('http://', 'ws://').replace('https://', 'wss://');

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  };
});

const wsLink = new GraphQLWsLink(createClient({
  url: wsUri,
  lazy: true,
  retryAttempts: 5,
  connectionParams: async () => {
    const token = _getToken ? await _getToken() : null;
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  },
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

export const AuthorizedApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(() => getToken({ template: 'hasura' }));
  }, [getToken]);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
};
