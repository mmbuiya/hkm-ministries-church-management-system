const ACTUAL_API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

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

async function cleanup() {
    console.log('Fetching members...');
    
    // Use SQL to find duplicates based on first_name, last_name, phone
    const sql = `
        WITH duplicate_records AS (
            SELECT 
                id,
                first_name,
                last_name,
                phone,
                ROW_NUMBER() OVER (
                    PARTITION BY LOWER(first_name), LOWER(last_name), phone 
                    ORDER BY joined_at ASC, id ASC
                ) as rn
            FROM members
        )
        DELETE FROM members 
        WHERE id IN (
            SELECT id FROM duplicate_records WHERE rn > 1
        )
        RETURNING id;
    `;

    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: "default",
            sql: sql
        }
    });

    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));
    console.log('Cleanup Complete!');
}

cleanup();
