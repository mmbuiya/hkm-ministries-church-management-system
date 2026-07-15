import { useState, useMemo } from 'react';
import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { GET_LOGIN_ATTEMPTS_QUERY, GET_LOGIN_ATTEMPTS_SUBSCRIPTION, ADD_LOGIN_ATTEMPT_MUTATION } from '../services/graphql/cleanup';

let cachedIp: string | null = null;

async function detectIp(): Promise<string> {
    if (cachedIp) return cachedIp;
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        cachedIp = data.ip;
        return cachedIp || 'Unknown';
    } catch {
        return 'Unknown';
    }
}

export function useLoginAttempts() {
    const [daysBack, setDaysBack] = useState(30);

    const startDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - daysBack);
        return d.toISOString();
    }, [daysBack]);

    // HTTP query fires immediately — works even when Hasura is waking up
    const { data: queryData, loading: queryLoading } = useQuery(GET_LOGIN_ATTEMPTS_QUERY, {
        variables: { startDate },
        fetchPolicy: 'cache-first'
    });

    // WebSocket subscription takes over once connected
    const { data: subData, loading: subLoading, error } = useSubscription(GET_LOGIN_ATTEMPTS_SUBSCRIPTION, {
        variables: { startDate },
        errorPolicy: 'all'
    });

    const [addAttemptMutation] = useMutation(ADD_LOGIN_ATTEMPT_MUTATION);

    const logLoginAttempt = async (attempt: any) => {
        try {
            const ip = attempt.ipAddress || await detectIp();
            const id = Date.now().toString();
            await addAttemptMutation({
                variables: {
                    object: {
                        id,
                        email: attempt.email,
                        timestamp: attempt.timestamp || new Date().toISOString(),
                        success: attempt.success,
                        failure_reason: attempt.failureReason,
                        ip_address: ip,
                        user_agent: attempt.userAgent || navigator.userAgent,
                        location: attempt.location || 'Unknown'
                    }
                }
            });
        } catch (err) {
            console.error('Error logging login attempt:', err);
        }
    };

    const loadMoreAttempts = () => setDaysBack(prev => prev + 30);

    return {
        attempts: subData?.login_attempts || queryData?.login_attempts || [],
        loading: queryLoading && !queryData,
        error,
        daysBack,
        loadMoreAttempts,
        logLoginAttempt
    };
}
