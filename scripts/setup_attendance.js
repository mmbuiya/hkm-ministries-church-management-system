
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    service TEXT NOT NULL,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attendance_records IS 'Daily attendance records for members';
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
    console.log('Running SQL for attendance_records...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking attendance_records table...');
    const trackRes = await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "attendance_records" }
        }
    }, 'v1/metadata');
    console.log('Tracking Result:', JSON.stringify(trackRes, null, 2));

    console.log('Creating relationships...');
    // Array relationship from members to attendance_records
    await runRequest({
        type: "pg_create_array_relationship",
        args: {
            source: "default",
            table: "members",
            name: "attendance_records",
            using: {
                foreign_key_constraint_on: {
                    table: "attendance_records",
                    column: "member_id"
                }
            }
        }
    }, 'v1/metadata');

    // Object relationship from attendance_records to members
    await runRequest({
        type: "pg_create_object_relationship",
        args: {
            source: "default",
            table: "attendance_records",
            name: "member",
            using: {
                foreign_key_constraint_on: "member_id"
            }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
