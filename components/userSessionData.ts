// User Session Tracking System
export interface UserSession {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    userRole: string;
    loginTime: string;
    logoutTime?: string;
    isActive: boolean;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    sessionDuration?: number; // in minutes
    lastActivity: string;
}

export interface LoginAttempt {
    id: string;
    email: string;
    timestamp: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
}

// System-level Super Admin credentials (unchangeable)
export const SYSTEM_SUPER_ADMIN = {
    email: 'system.admin@hkm.internal',
    username: 'HKM System Administrator',
    accessKey: 'HKM_SA_2024_SECURE_KEY',
    secretToken: 'HKM_ADMIN_TOKEN_2024_INTERNAL',
    masterCode: 'HKM_MASTER_ACCESS_2024'
} as const;

// Helper functions
export function createSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createLoginAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateSessionDuration(loginTime: string, logoutTime?: string): number {
    const start = new Date(loginTime).getTime();
    const end = logoutTime ? new Date(logoutTime).getTime() : Date.now();
    return Math.floor((end - start) / (1000 * 60)); // minutes
}

export function isSessionExpired(lastActivity: string, timeoutMinutes: number = 30): boolean {
    const lastActivityTime = new Date(lastActivity).getTime();
    const now = Date.now();
    return (now - lastActivityTime) > (timeoutMinutes * 60 * 1000);
}