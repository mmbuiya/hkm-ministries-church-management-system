
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS sms_records (
    id SERIAL PRIMARY KEY,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE sms_records IS 'Logs of SMS broadcasts sent to church members';
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
    console.log('Running SQL for sms_records...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking sms_records table...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "sms_records" }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
