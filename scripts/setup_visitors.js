
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    heard_from TEXT,
    first_visit DATE,
    registered_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    visitor_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    interaction_type TEXT NOT NULL,
    notes TEXT,
    next_follow_up_date DATE,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE visitors IS 'Church visitors directory';
COMMENT ON TABLE follow_ups IS 'Follow-up logs for visitors';
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
    console.log('Running SQL for visitors and follow_ups...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking tables...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "visitors" }
        }
    }, 'v1/metadata');

    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "follow_ups" }
        }
    }, 'v1/metadata');

    console.log('Creating relationships...');
    // visitor -> follow_ups (array)
    await runRequest({
        type: "pg_create_array_relationship",
        args: {
            source: "default",
            table: "visitors",
            name: "follow_ups",
            using: {
                foreign_key_constraint_on: {
                    table: "follow_ups",
                    column: "visitor_id"
                }
            }
        }
    }, 'v1/metadata');

    // follow_up -> visitor (object)
    await runRequest({
        type: "pg_create_object_relationship",
        args: {
            source: "default",
            table: "follow_ups",
            name: "visitor",
            using: {
                foreign_key_constraint_on: "visitor_id"
            }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
