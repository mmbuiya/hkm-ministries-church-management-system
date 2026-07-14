const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

const sql = `
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Income', 'Expense')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT DEFAULT '',
  member_id TEXT,
  non_member_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT transactions_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE SET NULL,
  CONSTRAINT transactions_category_check
    CHECK (
      type = 'Expense' OR category IN (
        'Tithe', 'Offering', 'Project Offering', 'Pledge', 'Seed',
        'Pastor''s Appreciation', 'Welfare', 'Children Service Offering',
        'Donation', 'Church Bills Contribution', 'Others'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);

COMMENT ON TABLE transactions IS 'Church financial transactions with contributor relationship';
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

async function createTransactionsTable() {
    console.log('Finding Data Source...');
    const sourceName = await getSourceName();
    console.log(`Using Source: ${sourceName}`);

    console.log('Creating/Updating transactions table...');
    const sqlRes = await runRequest({
        type: "run_sql",
        args: {
            source: sourceName,
            sql: sql
        }
    });
    console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

    console.log('Tracking table in Hasura...');
    await runRequest({
        type: "pg_track_table",
        args: {
            source: sourceName,
            table: { schema: "public", name: "transactions" }
        }
    }, 'v1/metadata');

    console.log('Creating Hasura object relationship for member...');
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

    console.log('Transactions table created with all constraints and relationships!');
}

createTransactionsTable();
