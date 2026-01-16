import React, { useState, useEffect } from 'react';
import MainLayout from './components/MainLayout';
import { User, SUPER_ADMIN_CONFIG } from './components/userData';
import { ToastProvider } from './components/ToastContext';
import { ThemeProvider } from './components/ThemeContext';
import { useAuth } from './components/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { gql } from '@apollo/client';
import { client } from './components/AuthorizedApolloProvider';
import {
    UserSession,
    createSessionId
} from './components/userSessionData';
import { useUserSessions } from './hooks/useUserSessions';
import { useLoginAttempts } from './hooks/useLoginAttempts';
import { UPSERT_USER_MUTATION } from './services/graphql/users_hasura';
import ClerkAuthPage from './components/ClerkAuthPage';
import OfflineIndicator from './components/OfflineIndicator';

const App: React.FC = () => {
    // Auth context and Clerk hooks
    const { user: authUser, logout: authLogout } = useAuth();
    const { isLoaded, isSignedIn } = useUser();

    // Hasura hooks
    const { addSession } = useUserSessions();
    const { logLoginAttempt } = useLoginAttempts();

    // Local state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    // Sync auth context user with local state
    useEffect(() => {
        if (authUser) {
            setCurrentUser(authUser);
            
            // Create user session when user logs in
            createUserSession(authUser).then(session => {
                if (session) {
                    console.log('User session created:', session);
                }
            }).catch(error => {
                console.error('Failed to create user session:', error);
            });
            
            // Log successful login attempt
            logLoginAttempt({
                email: authUser.email,
                timestamp: new Date().toISOString(),
                success: true,
                ipAddress: 'Unknown',
                userAgent: navigator.userAgent,
                location: 'Unknown'
            }).catch(error => {
                console.error('Failed to log login attempt:', error);
            });
            
            // Fetch all users for admin features
            client.query({
                query: gql`
                  query GetUsers {
                    users(order_by: {username: asc}) {
                      id username email role avatar last_login
                    }
                  }
                `,
                fetchPolicy: 'network-only'
            }).then(({ data }) => setUsers(data.users)).catch(console.error);
        } else {
            setCurrentUser(null);
        }
    }, [authUser]);

    // Session creation
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
                location: 'Unknown'
            };

            await addSession(sessionData);

            return {
                id: createSessionId(),
                ...sessionData
            };
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
                const existing = users.find(u => u.id === userData.id);
                if (!existing) return;
                updatedUser = { ...existing, ...userData } as User;
                setUsers(prev => prev.map(u => u.id === userData.id ? updatedUser : u));

                await client.mutate({
                    mutation: UPSERT_USER_MUTATION,
                    variables: {
                        object: {
                            id: updatedUser.id,
                            username: updatedUser.username,
                            email: updatedUser.email,
                            role: updatedUser.role,
                            avatar: updatedUser.avatar,
                            last_login: updatedUser.lastLogin
                        }
                    }
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
                    isActive: true
                };
                setUsers(prev => [updatedUser, ...prev]);

                await client.mutate({
                    mutation: UPSERT_USER_MUTATION,
                    variables: {
                        object: {
                            id: updatedUser.id,
                            username: updatedUser.username,
                            email: updatedUser.email,
                            role: updatedUser.role,
                            avatar: updatedUser.avatar,
                            last_login: new Date().toISOString()
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Error saving user", e);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                // Future: Add delete mutation
                setUsers(prev => prev.filter(u => u.id !== id));
            } catch (e) {
                console.error("Error deleting user", e);
            }
        }
    };

    if (!isLoaded) return null;

    return (
        <ThemeProvider>
            <ToastProvider>
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
            </ToastProvider>
        </ThemeProvider>
    );
};

export default App;
