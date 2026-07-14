const API_URL = 'https://sunny-zebra-57.hasura.app';
const ADMIN_SECRET = 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';

async function clearTransactions() {
    console.log('Deleting all transactions from Hasura...');
    const response = await fetch(`${API_URL}/v1/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({
            query: `mutation { delete_transactions(where: {}) { affected_rows } }`
        })
    });
    const data = await response.json();
    console.log('Result:', JSON.stringify(data, null, 2));
    if (data.data?.delete_transactions?.affected_rows !== undefined) {
        console.log(`Deleted ${data.data.delete_transactions.affected_rows} transaction(s).`);
    }
}

clearTransactions();
