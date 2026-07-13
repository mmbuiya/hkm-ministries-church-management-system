import { useSubscription, useMutation } from '@apollo/client';
import { GET_LOGIN_ATTEMPTS_SUBSCRIPTION, ADD_LOGIN_ATTEMPT_MUTATION } from '../services/graphql/cleanup';

export function useLoginAttempts() {
    const { data, loading, error } = useSubscription(GET_LOGIN_ATTEMPTS_SUBSCRIPTION, {
        errorPolicy: 'all'
    });
    const [addAttemptMutation] = useMutation(ADD_LOGIN_ATTEMPT_MUTATION);

    const logLoginAttempt = async (attempt: any) => {
        try {
            const id = Date.now().toString();
            await addAttemptMutation({
                variables: {
                    object: {
                        id,
                        email: attempt.email,
                        timestamp: attempt.timestamp || new Date().toISOString(),
                        success: attempt.success,
                        failure_reason: attempt.failureReason,
                        ip_address: attempt.ipAddress || 'Unknown',
                        user_agent: attempt.userAgent || navigator.userAgent,
                        location: attempt.location || 'Unknown'
                    }
                }
            });
            
            // Real-time subscription will update UI automatically
        } catch (err) {
            console.error('Error logging login attempt:', err);
        }
    };

    return {
        attempts: data?.login_attempts || [],
        loading,
        error,
        logLoginAttempt
    };
}
