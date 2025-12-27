/**
 * AuthContext - Professional Clerk Authentication Provider
 * Replaces Firebase with Clerk for better reliability and enterprise features.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from '@clerk/clerk-react';
import { User } from './userData';
import { client } from './AuthorizedApolloProvider';
import { UPSERT_USER_MUTATION, GET_USER_QUERY } from '../services/graphql/users_hasura';

// Types
interface AuthContextType {
    user: User | null;
    clerkUser: any | null; // Clerk user object
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, avatar?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Loading component
const LoadingScreen: React.FC = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white'
    }}>
        <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTop: '4px solid #4CAF50',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <p style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: 500
        }}>
            Initializing secure session...
        </p>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
    </div>
);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerkAuth();
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const { signUp, isLoaded: signUpLoaded } = useSignUp();

    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile from Hasura and sync
    const fetchAndSyncProfile = async (cUser: any) => {
        if (!cUser) return null;

        const email = cUser.primaryEmailAddress?.emailAddress;
        const uid = cUser.id;

        try {
            // 1. Try to get from Hasura
            const { data } = await client.query({
                query: GET_USER_QUERY,
                variables: { id: uid },
                fetchPolicy: 'network-only'
            });

            const superAdminEnv = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';
            const superAdminEmails = superAdminEnv.split(',').map(e => e.trim().toLowerCase());

            // Hardcoded fail-safe list
            const HARDCODED_SUPER_ADMINS = [
                'nissimasher2019@gmail.com',
                'njoros2025@gmail.com'
            ];

            const isSuperAdminEmail = email && (
                superAdminEmails.includes(email.toLowerCase()) ||
                HARDCODED_SUPER_ADMINS.includes(email.toLowerCase())
            );

            console.log('[AuthContext] Super Admin Check:', {
                currentEmail: email,
                superAdminEmails,
                hardcodedAdmins: HARDCODED_SUPER_ADMINS,
                isMatch: isSuperAdminEmail,
                uid: uid
            });

            if (data?.users_by_pk) {
                const hUser = data.users_by_pk;

                // Elevation logic: If user exists but is not Super Admin, and has the specific email, elevate them.
                if (isSuperAdminEmail && hUser.role !== 'Super Admin') {
                    console.log(`[AuthContext] Elevating ${email} to Super Admin`);
                    await client.mutate({
                        mutation: UPSERT_USER_MUTATION,
                        variables: {
                            object: {
                                id: uid,
                                username: hUser.username,
                                email: hUser.email,
                                role: 'Super Admin',
                                avatar: hUser.avatar,
                                last_login: new Date().toISOString()
                            }
                        }
                    });
                    hUser.role = 'Super Admin';
                }

                return {
                    id: hUser.id,
                    username: hUser.username,
                    email: hUser.email,
                    role: hUser.role as any,
                    avatar: hUser.avatar,
                    lastLogin: hUser.last_login,
                    permissionLevel: (hUser.role === 'Admin' || hUser.role === 'Super Admin') ? 'Editor' : 'Viewer',
                    passwordHash: 'MANAGED_BY_CLERK'
                } as User;
            }

            // 2. If not in Hasura, create it (Sync)
            const role = isSuperAdminEmail ? 'Super Admin' : 'Guest';

            const newProfile: User = {
                id: uid,
                username: email?.split('@')[0] || 'User',
                email: email || '',
                role: role as any,
                permissionLevel: role === 'Super Admin' ? 'Editor' : 'Viewer',
                passwordHash: 'MANAGED_BY_CLERK',
                lastLogin: new Date().toISOString(),
                avatar: cUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(email || 'User')}`,
            };

            await client.mutate({
                mutation: UPSERT_USER_MUTATION,
                variables: {
                    object: {
                        id: newProfile.id,
                        username: newProfile.username,
                        email: newProfile.email,
                        role: newProfile.role,
                        avatar: newProfile.avatar,
                        last_login: newProfile.lastLogin
                    }
                }
            });

            return newProfile;
        } catch (err) {
            console.error('[AuthContext] Profile sync error:', err);
            // Return minimal fallback if sync fails
            const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
            const isSuperAdminEmail = email && superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase();
            const role = isSuperAdminEmail ? 'Super Admin' : 'Guest';

            return {
                id: uid,
                username: email?.split('@')[0] || 'User',
                email: email || '',
                role: role as any,
                permissionLevel: role === 'Super Admin' ? 'Editor' : 'Viewer',
                passwordHash: 'MANAGED_BY_CLERK',
                lastLogin: new Date().toISOString(),
                avatar: cUser.imageUrl || '',
            } as User;
        }
    };

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn && clerkUser) {
                fetchAndSyncProfile(clerkUser).then(profile => {
                    setUserProfile(profile);
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        }
    }, [isLoaded, isSignedIn, clerkUser]);

    // Login function (Clerk handles most of this via its own components, but we keep this for compatibility)
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        if (!signInLoaded) return { success: false, error: "Auth not ready" };

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === 'complete') {
                return { success: true };
            } else {
                return { success: false, error: "Additional steps required (2FA, etc.)" };
            }
        } catch (error: any) {
            console.error('[AuthContext] Clerk login error:', error);
            return { success: false, error: error.errors?.[0]?.message || "Login failed" };
        }
    };

    // Register function
    const register = async (email: string, password: string, avatar?: string): Promise<{ success: boolean; error?: string; user?: User }> => {
        if (!signUpLoaded) return { success: false, error: "Auth not ready" };

        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
            });

            if (result.status === 'complete') {
                // Success - Clerk handles the session
                return { success: true };
            } else {
                return { success: false, error: "Registration incomplete (verification needed)" };
            }
        } catch (error: any) {
            console.error('[AuthContext] Clerk register error:', error);
            return { success: false, error: error.errors?.[0]?.message || "Registration failed" };
        }
    };

    // Logout function
    const logout = async (): Promise<void> => {
        await signOut();
        setUserProfile(null);
    };

    // Refresh user profile
    const refreshUser = async (): Promise<void> => {
        if (clerkUser) {
            const profile = await fetchAndSyncProfile(clerkUser);
            setUserProfile(profile);
        }
    };

    const value: AuthContextType = {
        user: userProfile,
        clerkUser: clerkUser,
        loading: loading || !isLoaded,
        isAuthenticated: isSignedIn,
        login,
        register,
        logout,
        refreshUser
    };

    if (loading || !isLoaded) {
        return <LoadingScreen />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
