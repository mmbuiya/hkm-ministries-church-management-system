const ACTUAL_API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
if (!ADMIN_SECRET) throw new Error('HASURA_ADMIN_SECRET environment variable is required');

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
        if (data.errors) {
            console.error('GraphQL/Hasura Errors:', JSON.stringify(data.errors, null, 2));
            throw new Error('Hasura request failed');
        }
        return data;
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error);
        throw error;
    }
}

async function setup() {
    console.log('Running SQL for portal backend features...');
    const sql = `
        -- 1. Update members table
        ALTER TABLE members ADD COLUMN IF NOT EXISTS pin TEXT;
        ALTER TABLE members ADD COLUMN IF NOT EXISTS is_portal_active BOOLEAN DEFAULT false;

        -- 2. Create messages table for internal mailbox
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sender_id TEXT NOT NULL,
            receiver_id TEXT,
            department TEXT,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            status TEXT DEFAULT 'Unread',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        COMMENT ON TABLE messages IS 'Internal mailbox/helpdesk messages between members and departments';
    `;

    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking messages table...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "messages" }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();

