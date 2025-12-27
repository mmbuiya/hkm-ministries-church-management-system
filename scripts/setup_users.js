
const API_URL = 'https://sunny-zebra-57.app.app'; // Fixed link in next step if wrong, checking .env
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

// I noticed the API URL in previous scripts was 'https://sunny-zebra-57.hasura.app'
const ACTUAL_API_URL = 'https://sunny-zebra-57.hasura.app';

const sql = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Data Personnel',
    avatar TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User profiles and role tracking';
`;

async function runRequest(payload, endpoint = 'v2/query') {
    try {
        const response = await fetch(`${ACTUAL_API_URL}/${endpoint}`, {
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
    console.log('Running SQL for users...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking users table...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "users" }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
