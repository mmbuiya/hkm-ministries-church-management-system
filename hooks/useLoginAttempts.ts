import { useQuery, useMutation } from '@apollo/client';
import { GET_LOGIN_ATTEMPTS_QUERY, ADD_LOGIN_ATTEMPT_MUTATION } from '../services/graphql/cleanup';

export function useLoginAttempts() {
    const { data, loading, error, refetch } = useQuery(GET_LOGIN_ATTEMPTS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
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
            
            // Refetch data to update UI immediately
            await refetch();
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
