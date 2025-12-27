
import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
    // Use the environment variable we added
    uri: import.meta.env.VITE_HASURA_GRAPHQL_URL || 'https://sunny-zebra-57.hasura.app/v1/graphql',
});

const authLink = setContext((_, { headers }) => {
    // in a production app, we would use Firebase ID Token with Custom Claims here.
    // const token = await fbService.auth.getCurrentUser()?.getIdToken();

    // For MVP/Dev, we use the Admin Secret to bypass complex JWT claim setup
    // WARNING: This exposes the secret in the client bundle. Iterate on this before public launch.
    const adminSecret = import.meta.env.VITE_HASURA_ADMIN_SECRET || 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

    return {
        headers: {
            ...headers,
            'x-hasura-admin-secret': adminSecret
        }
    }
});

export const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
});

export const AuthorizedApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ApolloProvider client={client}>
        {children}
    </ApolloProvider>
);
