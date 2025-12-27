import { useQuery, useMutation } from '@apollo/client';
import { useMemo } from 'react';
import { UserSession, LoginAttempt } from '../components/userSessionData';
import {
    GET_USER_SESSIONS_QUERY,
    GET_LOGIN_ATTEMPTS_QUERY,
    ADD_USER_SESSION_MUTATION,
    UPDATE_USER_SESSION_MUTATION,
    END_USER_SESSION_MUTATION,
    ADD_LOGIN_ATTEMPT_MUTATION
} from '../services/graphql/cleanup';

export function useUserSessions() {
    const { data, loading, error, refetch } = useQuery(GET_USER_SESSIONS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addSessionMutation] = useMutation(ADD_USER_SESSION_MUTATION);
    const [updateSessionMutation] = useMutation(UPDATE_USER_SESSION_MUTATION);
    const [endSessionMutation] = useMutation(END_USER_SESSION_MUTATION);

    const sessions: UserSession[] = useMemo(() => {
        if (!data?.user_sessions) return [];
        return data.user_sessions.map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            userEmail: s.user_email,
            userName: s.user_name,
            userRole: s.user_role,
            loginTime: s.login_time,
            logoutTime: s.logout_time,
            isActive: s.is_active,
            ipAddress: s.ip_address,
            userAgent: s.user_agent,
            location: s.location,
            sessionDuration: s.session_duration,
            lastActivity: s.last_activity
        }));
    }, [data]);

    const addSession = async (session: Omit<UserSession, 'id'>) => {
        const id = Date.now().toString();
        await addSessionMutation({
            variables: {
                object: {
                    id,
                    user_id: session.userId,
                    user_email: session.userEmail,
                    user_name: session.userName,
                    user_role: session.userRole,
                    login_time: session.loginTime,
                    logout_time: session.logoutTime,
                    is_active: session.isActive,
                    ip_address: session.ipAddress,
                    user_agent: session.userAgent,
                    location: session.location,
                    session_duration: session.sessionDuration,
                    last_activity: session.lastActivity
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateSession = async (id: string, changes: Partial<UserSession>) => {
        await updateSessionMutation({
            variables: {
                id,
                changes: {
                    user_id: changes.userId,
                    user_email: changes.userEmail,
                    user_name: changes.userName,
                    user_role: changes.userRole,
                    login_time: changes.loginTime,
                    logout_time: changes.logoutTime,
                    is_active: changes.isActive,
                    ip_address: changes.ipAddress,
                    user_agent: changes.userAgent,
                    location: changes.location,
                    session_duration: changes.sessionDuration,
                    last_activity: changes.lastActivity
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const endSession = async (id: string, logoutTime: string) => {
        await endSessionMutation({
            variables: {
                id,
                logout_time: logoutTime
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        sessions,
        loading,
        error,
        addSession,
        updateSession,
        endSession
    };
}

export function useLoginAttempts() {
    const { data, loading, error, refetch } = useQuery(GET_LOGIN_ATTEMPTS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addAttemptMutation] = useMutation(ADD_LOGIN_ATTEMPT_MUTATION);

    const attempts: LoginAttempt[] = useMemo(() => {
        if (!data?.login_attempts) return [];
        return data.login_attempts.map((a: any) => ({
            id: a.id,
            email: a.email,
            timestamp: a.timestamp,
            success: a.success,
            failureReason: a.failure_reason,
            ipAddress: a.ip_address,
            userAgent: a.user_agent,
            location: a.location
        }));
    }, [data]);

    const addAttempt = async (attempt: Omit<LoginAttempt, 'id'>) => {
        const id = Date.now().toString();
        await addAttemptMutation({
            variables: {
                object: {
                    id,
                    email: attempt.email,
                    timestamp: attempt.timestamp,
                    success: attempt.success,
                    failure_reason: attempt.failureReason,
                    ip_address: attempt.ipAddress,
                    user_agent: attempt.userAgent,
                    location: attempt.location
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        attempts,
        loading,
        error,
        addAttempt
    };
}