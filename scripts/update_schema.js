const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
ALTER TABLE members ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_transform TEXT;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (type = 'Expense' OR category IN (
    'Tithe', 'Offering', 'Project Offering', 'Pledge', 'Seed',
    'Pastor''s Appreciation', 'Welfare', 'Children Service Offering',
    'Donation', 'Church Bills Contribution', 'Others'
  ));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_member_id_fkey;

UPDATE transactions SET member_id = NULL
WHERE member_id IS NOT NULL
  AND member_id != ''
  AND member_id NOT IN (SELECT id FROM members);

ALTER TABLE transactions
  ADD CONSTRAINT transactions_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_department ON members(department);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
`;

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

    console.log('Running schema updates...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: sourceName,
            sql: sql
        }
    });

    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Creating foreign key relationships in Hasura metadata...');
    await runRequest({
        type: "pg_create_object_relationship",
        args: {
            source: sourceName,
            table: { schema: "public", name: "transactions" },
            name: "member",
            using: {
                foreign_key_constraint_on: "member_id"
            }
        }
    }, 'v1/metadata');

    console.log('Schema Updated Successfully!');
    console.log('Changes applied:');
    console.log('  - Added title and avatar_transform columns to members table');
    console.log('  - Added category CHECK constraint with Church Bills Contribution');
    console.log('  - Added foreign key: transactions.member_id -> members.id');
    console.log('  - Created performance indexes on transactions and members tables');
}

updateSchema();
