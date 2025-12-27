
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
-- Recycle Bin Table
CREATE TABLE IF NOT EXISTS recycle_bin (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    deleted_by TEXT REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Permission Requests Table
CREATE TABLE IF NOT EXISTS permission_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT REFERENCES users(id),
    requester_name TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    request_type TEXT NOT NULL, -- 'edit', 'delete'
    data_type TEXT NOT NULL,
    data_id TEXT NOT NULL,
    data_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'expired'
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    ip_address TEXT,
    user_agent TEXT,
    location TEXT,
    session_duration INTEGER, -- in minutes
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login Attempts Table
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    location TEXT
);

COMMENT ON TABLE recycle_bin IS 'Stores deleted entities for potential restoration';
COMMENT ON TABLE permission_requests IS 'Requests for temporary elevated permissions';
COMMENT ON TABLE user_sessions IS 'Tracks active and past user sessions';
COMMENT ON TABLE login_attempts IS 'Logs all authentication attempts for security auditing';
`;

async function runRequest(payload, endpoint = 'v2/query') {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hasura-admin-secret': ADMIN_SECRET
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error);
        throw error;
    }
}

async function setup() {
    console.log('Running SQL for cleanup tables...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    const tables = ["recycle_bin", "permission_requests", "user_sessions", "login_attempts"];

    for (const table of tables) {
        console.log(`Tracking ${table} table...`);
        await runRequest({
            type: "pg_track_table",
            args: {
                source: "default",
                table: { schema: "public", name: table }
            }
        }, 'v1/metadata');
    }

    console.log('Setup Complete!');
}

setup();
