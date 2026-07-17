import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { UserSession, LoginAttempt } from '../components/userSessionData';
import {
  GET_USER_SESSIONS_QUERY,
  GET_LOGIN_ATTEMPTS_QUERY,
  ADD_USER_SESSION_MUTATION,
  UPDATE_USER_SESSION_MUTATION,
  END_USER_SESSION_MUTATION,
  ADD_LOGIN_ATTEMPT_MUTATION,
} from '../services/graphql/cleanup';

// Helper to compute a start date N days ago as ISO string
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function mapSession(s: any): UserSession {
  return {
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
    lastActivity: s.last_activity,
  };
}

export function useUserSessions() {
  const [daysBack, setDaysBack] = useState(30);
  const startDate = useMemo(() => daysAgoISO(daysBack), [daysBack]);

  const {
    data: queryData,
    loading: queryLoading,
    error,
  } = useQuery(GET_USER_SESSIONS_QUERY, {
    variables: { startDate },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [addSessionMutation] = useMutation(ADD_USER_SESSION_MUTATION);
  const [updateSessionMutation] = useMutation(UPDATE_USER_SESSION_MUTATION);
  const [endSessionMutation] = useMutation(END_USER_SESSION_MUTATION);

  const sessions: UserSession[] = useMemo(() => {
    const raw = queryData?.user_sessions;
    if (!raw) return [];
    return raw.map(mapSession);
  }, [queryData]);

  const loadMoreSessions = () => setDaysBack((prev) => prev + 30);

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
          last_activity: session.lastActivity,
        },
      },
      refetchQueries: [{ query: GET_USER_SESSIONS_QUERY }],
    });
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
          last_activity: changes.lastActivity,
        },
      },
      refetchQueries: [{ query: GET_USER_SESSIONS_QUERY }],
    });
  };

  const endSession = async (id: string, logoutTime: string) => {
    await endSessionMutation({
      variables: { id, logout_time: logoutTime },
      refetchQueries: [{ query: GET_USER_SESSIONS_QUERY }],
    });
  };

  return {
    sessions,
    loading: queryLoading && !queryData,
    error,
    daysBack,
    loadMoreSessions,
    addSession,
    updateSession,
    endSession,
  };
}

export function useLoginAttempts() {
  const [daysBack, setDaysBack] = useState(30);
  const startDate = useMemo(() => daysAgoISO(daysBack), [daysBack]);

  const {
    data: queryData,
    loading: queryLoading,
    error,
  } = useQuery(GET_LOGIN_ATTEMPTS_QUERY, {
    variables: { startDate },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [addAttemptMutation] = useMutation(ADD_LOGIN_ATTEMPT_MUTATION);

  const attempts: LoginAttempt[] = useMemo(() => {
    const raw = queryData?.login_attempts;
    if (!raw) return [];
    return raw.map((a: any) => ({
      id: a.id,
      email: a.email,
      timestamp: a.timestamp,
      success: a.success,
      failureReason: a.failure_reason,
      ipAddress: a.ip_address,
      userAgent: a.user_agent,
      location: a.location,
    }));
  }, [queryData]);

  const loadMoreAttempts = () => setDaysBack((prev) => prev + 30);

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
          location: attempt.location,
        },
      },
      refetchQueries: [{ query: GET_LOGIN_ATTEMPTS_QUERY }],
    });
  };

  return {
    attempts,
    loading: queryLoading && !queryData,
    error,
    daysBack,
    loadMoreAttempts,
    addAttempt,
  };
}
