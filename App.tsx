import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import { User } from './components/userData';
import { ToastProvider } from './components/ToastContext';
import { ThemeProvider } from './components/ThemeContext';
import { useAuth } from './components/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { gql } from '@apollo/client';
import { client } from './components/AuthorizedApolloProvider';
import { UserSession, createSessionId } from './components/userSessionData';
import { useUserSessions } from './hooks/useUserSessions';
import { useLoginAttempts } from './hooks/useLoginAttempts';
import { UPSERT_USER_MUTATION } from './services/graphql/users';
import ClerkAuthPage from './components/ClerkAuthPage';
import OfflineIndicator from './components/OfflineIndicator';

// Portal Pages (no Clerk auth needed — uses its own PIN-based auth)
import { ApolloProvider } from '@apollo/client';
import { portalApolloClient } from './portal/services/portalApollo';
import PortalLogin from './portal/pages/PortalLogin';
import SetPassword from './portal/pages/SetPassword';
import MemberDashboard from './portal/pages/MemberDashboard';
import PortalAuthGuard from './portal/components/PortalAuthGuard';

// ─── Admin CMS (Clerk-guarded) ────────────────────────────────────────────────
const AdminApp: React.FC = () => {
  const { user: authUser, logout: authLogout } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const { addSession } = useUserSessions();
  const { logLoginAttempt } = useLoginAttempts();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);

      createUserSession(authUser)
        .then((session) => {
          if (session) console.warn('User session created:', session);
        })
        .catch((error) => console.error('Failed to create user session:', error));

      logLoginAttempt({
        email: authUser.email,
        timestamp: new Date().toISOString(),
        success: true,
        userAgent: navigator.userAgent,
        location: 'Unknown',
      }).catch(() => {});

      client
        .query({
          query: gql`
            query GetUsers {
              usersCollection(orderBy: [{ username: AscNullsLast }]) {
                edges {
                  node {
                    id
                    username
                    email
                    role
                    avatar
                    last_login
                  }
                }
              }
            }
          `,
          fetchPolicy: 'network-only',
        })
        .then(({ data }) => setUsers(data?.usersCollection?.edges?.map((e: { node: unknown }) => e.node) ?? []))
        .catch(console.error);
    } else {
      setCurrentUser(null);
    }
  }, [authUser]);

  const createUserSession = async (user: User): Promise<UserSession | null> => {
    try {
      const sessionData = {
        userId: user.id,
        userEmail: user.email,
        userName: user.username,
        userRole: user.role,
        loginTime: new Date().toISOString(),
        isActive: true,
        lastActivity: new Date().toISOString(),
        ipAddress: 'Unknown',
        userAgent: navigator.userAgent,
        location: 'Unknown',
      };
      await addSession(sessionData);
      return { id: createSessionId(), ...sessionData };
    } catch (error) {
      console.warn('[App] Session creation failed:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    await authLogout();
    setCurrentUser(null);
    setUsers([]);
  };

  const handleSaveOrUpdateUser = async (userData: Partial<User>) => {
    try {
      let updatedUser: User;
      if (userData.id) {
        const existing = users.find((u) => u.id === userData.id);
        if (!existing) return;
        updatedUser = { ...existing, ...userData } as User;
        setUsers((prev) => prev.map((u) => (u.id === userData.id ? updatedUser : u)));
        await client.mutate({
          mutation: UPSERT_USER_MUTATION,
          variables: {
            object: {
              id: updatedUser.id,
              username: updatedUser.username,
              email: updatedUser.email,
              role: updatedUser.role,
              avatar: updatedUser.avatar,
              last_login: updatedUser.lastLogin,
            },
          },
        });
      } else {
        const id = Date.now().toString();
        updatedUser = {
          id,
          username: userData.username!,
          email: userData.email!,
          role: userData.role || 'Guest',
          permissionLevel: userData.permissionLevel || 'Viewer',
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.email}`,
          lastLogin: 'Never',
          assignedSections: userData.assignedSections || [],
          isActive: true,
        };
        setUsers((prev) => [updatedUser, ...prev]);
        await client.mutate({
          mutation: UPSERT_USER_MUTATION,
          variables: {
            object: {
              id: updatedUser.id,
              username: updatedUser.username,
              email: updatedUser.email,
              role: updatedUser.role,
              avatar: updatedUser.avatar,
              last_login: new Date().toISOString(),
            },
          },
        });
      }
    } catch (e) {
      console.error('Error saving user', e);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } catch (e) {
        console.error('Error deleting user', e);
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <>
      {!isSignedIn ? (
        <ClerkAuthPage />
      ) : (
        <>
          <MainLayout
            currentUser={currentUser}
            users={users}
            onSaveOrUpdateUser={handleSaveOrUpdateUser}
            onDeleteUser={handleDeleteUser}
            onLogout={handleLogout}
          />
          <OfflineIndicator />
        </>
      )}
    </>
  );
};

// ─── Root App with Router ─────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Member Portal — public PIN-based auth, no Clerk */}
            <Route
              path="/portal/login"
              element={
                <ApolloProvider client={portalApolloClient}>
                  <PortalLogin />
                </ApolloProvider>
              }
            />
            <Route
              path="/portal/set-password"
              element={
                <ApolloProvider client={portalApolloClient}>
                  <SetPassword />
                </ApolloProvider>
              }
            />
            <Route
              path="/portal/dashboard"
              element={
                <ApolloProvider client={portalApolloClient}>
                  <PortalAuthGuard>
                    <MemberDashboard />
                  </PortalAuthGuard>
                </ApolloProvider>
              }
            />
            {/* Admin CMS — all other routes handled by the existing AdminApp */}
            <Route path="/*" element={<AdminApp />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
