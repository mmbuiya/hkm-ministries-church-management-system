
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    purchase_date DATE,
    purchase_price NUMERIC,
    condition TEXT,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    cost NUMERIC,
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE equipment IS 'Inventory of church equipment and assets';
COMMENT ON TABLE maintenance_records IS 'Logs of maintenance and repairs for equipment';
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
    console.log('Running SQL for equipment and maintenance...');
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
            table: { schema: "public", name: "equipment" }
        }
    }, 'v1/metadata');

    await runRequest({
        type: "pg_track_table",
        args: {
            source: "default",
            table: { schema: "public", name: "maintenance_records" }
        }
    }, 'v1/metadata');

    console.log('Creating relationships...');
    // equipment -> maintenance_records (array)
    await runRequest({
        type: "pg_create_array_relationship",
        args: {
            source: "default",
            table: "equipment",
            name: "maintenance_records",
            using: {
                foreign_key_constraint_on: {
                    table: "maintenance_records",
                    column: "equipment_id"
                }
            }
        }
    }, 'v1/metadata');

    // maintenance_record -> equipment (object)
    await runRequest({
        type: "pg_create_object_relationship",
        args: {
            source: "default",
            table: "maintenance_records",
            name: "equipment",
            using: {
                foreign_key_constraint_on: "equipment_id"
            }
        }
    }, 'v1/metadata');

    console.log('Setup Complete!');
}

setup();
