import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { User as AppUser } from '../components/userData';
import {
  GET_USERS_QUERY,
  GET_USERS_SUBSCRIPTION,
  UPSERT_USER_MUTATION,
  DELETE_USER_MUTATION,
} from '../services/graphql/users';

export function useUsers() {
  const { data: queryData, loading: queryLoading } = useQuery(GET_USERS_QUERY, {
    fetchPolicy: 'cache-first',
  });
  const {
    data: subData,
    loading: subLoading,
    error,
  } = useSubscription(GET_USERS_SUBSCRIPTION, {
    errorPolicy: 'all',
  });
  const [upsertUserMutation] = useMutation(UPSERT_USER_MUTATION);
  const [deleteUserMutation] = useMutation(DELETE_USER_MUTATION);

  const users: AppUser[] = useMemo(() => {
    const raw = subData?.users || queryData?.users;
    if (!raw) return [];
    return raw.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.username}`,
      lastLogin: u.last_login || '',
      passwordHash: 'MANAGED_BY_FIREBASE',
    }));
  }, [subData, queryData]);

  const upsertUser = async (user: Partial<AppUser>) => {
    if (!user.id || !user.email) return;

    await upsertUserMutation({
      variables: {
        object: {
          id: user.id,
          username: user.username || user.email.split('@')[0],
          email: user.email,
          role: user.role || 'Data Personnel',
          avatar: user.avatar,
          last_login: user.lastLogin || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    // Real-time subscription will update UI automatically
  };

  const deleteUser = async (id: string) => {
    await deleteUserMutation({
      variables: { id },
    });

    // Real-time subscription will update UI automatically
  };

  return {
    users,
    loading: queryLoading && !queryData,
    error,
    upsertUser,
    deleteUser,
  };
}
