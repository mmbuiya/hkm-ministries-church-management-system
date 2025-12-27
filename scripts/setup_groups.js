
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    leader_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE groups IS 'Church departments and cell groups';
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
    console.log('Running SQL for groups...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking groups table...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "groups" }
        }
    }, 'v1/metadata');

    console.log('Creating relationships...');
    // group -> leader (object)
    await runRequest({
        type: "pg_create_object_relationship",
        args: {
            source: "default",
            table: "groups",
            name: "leader",
            using: {
                foreign_key_constraint_on: "leader_id"
            }
        }
    }, 'v1/metadata');

    // member -> groups_led (array)
    await runRequest({
        type: "pg_create_array_relationship",
        args: {
            source: "default",
            table: "members",
            name: "groups_led",
            using: {
                foreign_key_constraint_on: {
                    table: "groups",
                    column: "leader_id"
                }
            }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
