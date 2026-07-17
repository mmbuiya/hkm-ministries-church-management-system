import { useMutation, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { User as AppUser } from '../components/userData';
import { GET_USERS_QUERY, UPSERT_USER_MUTATION, DELETE_USER_MUTATION } from '../services/graphql/users';

export function useUsers() {
  const {
    data: queryData,
    loading,
    error,
  } = useQuery(GET_USERS_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });
  const [upsertUserMutation] = useMutation(UPSERT_USER_MUTATION, {
    refetchQueries: [{ query: GET_USERS_QUERY }],
  });
  const [deleteUserMutation] = useMutation(DELETE_USER_MUTATION, {
    refetchQueries: [{ query: GET_USERS_QUERY }],
  });

  const users: AppUser[] = useMemo(() => {
    if (!queryData?.users) return [];
    return queryData.users.map(
      (u: { id: string; username?: string; email?: string; role?: string; avatar?: string; last_login?: string }) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.username}`,
        lastLogin: u.last_login || '',
        passwordHash: 'MANAGED_BY_FIREBASE',
      }),
    );
  }, [queryData]);

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
  };

  const deleteUser = async (id: string) => {
    await deleteUserMutation({
      variables: { id },
    });
  };

  return {
    users,
    loading,
    error,
    upsertUser,
    deleteUser,
  };
}
