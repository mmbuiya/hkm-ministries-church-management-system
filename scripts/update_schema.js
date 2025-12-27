
const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
ALTER TABLE members ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_transform TEXT;
`;

// Helper to fetch/determine source name
async function getSourceName() {
    try {
        const response = await fetch(`${API_URL}/v1/metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hasura-admin-secret': ADMIN_SECRET
            },
            body: JSON.stringify({ type: "export_metadata", args: {} })
        });
        const data = await response.json();
        return data.sources?.[0]?.name || 'default';
    } catch (e) {
        console.error("Error fetching metadata:", e);
        return 'default';
    }
}

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

async function updateSchema() {
    console.log('Finding Data Source...');
    const sourceName = await getSourceName();
    console.log(`Using Source: ${sourceName}`);

    console.log('Adding missing columns...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: sourceName,
            sql: sql
        }
    });

    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    // We don't need to track columns, they are automatically available if table is tracked.
    // However, sometimes we might need to "reload metadata" if it doesn't show up.
    // But usually it's fine.

    console.log('Schema Updated!');
}

updateSchema();
