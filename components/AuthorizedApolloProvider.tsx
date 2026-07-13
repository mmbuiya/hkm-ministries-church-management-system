import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpUri = import.meta.env.VITE_HASURA_GRAPHQL_URL || 'https://sunny-zebra-57.hasura.app/v1/graphql';
const wsUri = httpUri.replace('http://', 'ws://').replace('https://', 'wss://');

const adminSecret = import.meta.env.VITE_HASURA_ADMIN_SECRET || 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const httpLink = createHttpLink({
    uri: httpUri,
});

const authLink = setContext((_, { headers }) => {
    return {
        headers: {
            ...headers,
            'x-hasura-admin-secret': adminSecret
        }
    }
});

const wsLink = new GraphQLWsLink(createClient({
  url: wsUri,
  connectionParams: {
    headers: {
      'x-hasura-admin-secret': adminSecret
    }
  }
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

export const AuthorizedApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ApolloProvider client={client}>
        {children}
    </ApolloProvider>
);
