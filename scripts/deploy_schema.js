
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';
const DATABASE_URL = 'postgresql://neondb_owner:npg_usvajkBxh01F@ep-sparkling-wildflower-a4d8lgyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  role TEXT DEFAULT 'Guest',
  permission_level TEXT DEFAULT 'Viewer',
  avatar TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Active',
  dob DATE,
  gender TEXT,
  address TEXT,
  marital_status TEXT,
  occupation TEXT,
  campus TEXT,
  caring_leader TEXT,
  department TEXT,
  joined_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'System users and admins';
COMMENT ON TABLE members IS 'Church members directory';
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

async function deploy() {
    console.log('Checking Data Sources...');

    let metadata = await runRequest({
        type: "export_metadata",
        args: {}
    }, 'v1/metadata');

    let sourceName = 'default';

    if (!metadata || !metadata.sources || metadata.sources.length === 0) {
        console.log('⚠️ No database connected. Connecting Neon DB...');

        // Connect Database
        const connectRes = await runRequest({
            type: "pg_add_source",
            args: {
                name: "default",
                configuration: {
                    connection_info: {
                        database_url: DATABASE_URL,
                        pool_settings: {
                            retries: 1,
                            idle_timeout: 180,
                            max_connections: 50
                        }
                    }
                }
            }
        }, 'v1/metadata');

        if (connectRes.message === 'success') {
            console.log('✅ Database connected successfully!');
        } else {
            console.error('❌ Failed to connect database:', JSON.stringify(connectRes, null, 2));
            return;
        }
    } else {
        sourceName = metadata.sources[0].name;
        console.log(`✅ Found existing source: "${sourceName}"`);
    }

    // 1. Run SQL
    console.log('Running SQL Schema...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: sourceName,
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    // 2. Track Tables
    console.log('Tracking tables...');

    await runRequest({
        type: "pg_track_table",
        args: {
            source: sourceName,
            table: { schema: "public", name: "users" }
        }
    }, 'v1/metadata');

    await runRequest({
        type: "pg_track_table",
        args: {
            source: sourceName,
            table: { schema: "public", name: "members" }
        }
    }, 'v1/metadata');

    console.log('Deployment Complete!');
}

deploy();
