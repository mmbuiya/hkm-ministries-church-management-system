import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Transaction } from '../components/financeData';
import {
    GET_TRANSACTIONS_QUERY,
    ADD_TRANSACTION_MUTATION,
    UPDATE_TRANSACTION_MUTATION,
    DELETE_TRANSACTION_MUTATION
} from '../services/graphql/transactions';

interface HasuraMember {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
    phone?: string;
    email?: string;
    status?: string;
}

interface HasuraTransaction {
    id: number;
    date: string;
    category: string;
    type: 'Income' | 'Expense';
    amount: number;
    description?: string;
    member_id?: string;
    non_member_name?: string;
    member?: HasuraMember | null;
}

function transformTransaction(hasuraTx: HasuraTransaction): Transaction {
    let contributorName: string | undefined;
    let contributorPhone: string | undefined;

    if (hasuraTx.member) {
        contributorName = `${hasuraTx.member.first_name} ${hasuraTx.member.last_name}`.trim();
        contributorPhone = hasuraTx.member.phone;
    } else if (hasuraTx.non_member_name) {
        contributorName = hasuraTx.non_member_name;
    }

    return {
        id: hasuraTx.id,
        date: hasuraTx.date,
        category: hasuraTx.category as any,
        type: hasuraTx.type,
        amount: parseFloat(hasuraTx.amount.toString()),
        description: hasuraTx.description || '',
        memberId: hasuraTx.member_id,
        nonMemberName: hasuraTx.non_member_name,
        contributorName,
        contributorPhone,
    };
}

export function useTransactions() {
    const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS_QUERY, {
        pollInterval: 5000,
        errorPolicy: 'all'
    });
    const [addTransactionMutation] = useMutation(ADD_TRANSACTION_MUTATION);
    const [updateTransactionMutation] = useMutation(UPDATE_TRANSACTION_MUTATION);
    const [deleteTransactionMutation] = useMutation(DELETE_TRANSACTION_MUTATION);

    const transactions: Transaction[] = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.map(transformTransaction);
    }, [data]);

    const addTransaction = async (transaction: Omit<Transaction, 'id'> | Transaction) => {
        console.log('[useTransactions] addTransaction called', { date: transaction.date, category: transaction.category, type: transaction.type, amount: transaction.amount, memberId: transaction.memberId });
        try {
            console.log('[useTransactions] Sending GraphQL mutation...');
            const result = await addTransactionMutation({
                variables: {
                    object: {
                        date: transaction.date,
                        category: transaction.category,
                        type: transaction.type,
                        amount: transaction.amount,
                        description: transaction.description || '',
                        member_id: transaction.memberId || null,
                        non_member_name: transaction.nonMemberName || null
                    }
                }
            });

            console.log('[useTransactions] Mutation result:', result);

            if (result.errors && result.errors.length > 0) {
                const errorMessages = result.errors.map(e => e.message).join('; ');
                console.error('[useTransactions] GraphQL errors:', result.errors);
                throw new Error(`Database error: ${errorMessages}`);
            }

            if (!result.data?.insert_transactions_one) {
                console.error('[useTransactions] No insert_transactions_one in result', { data: result.data });
                throw new Error('Transaction could not be saved. The database rejected the operation.');
            }

            console.log('[useTransactions] Mutation succeeded, refetching...');
            await refetch();
            console.log('[useTransactions] Refetch complete');
        } catch (error: any) {
            console.error('[useTransactions] Error adding transaction:', error);
            const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to save transaction. Please check your connection and try again.';
            console.error('[useTransactions] Throwing error:', message);
            throw new Error(message);
        }
    };

    const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
        try {
            const hasuraUpdates: any = {};

            if (updates.date !== undefined) hasuraUpdates.date = updates.date;
            if (updates.category !== undefined) hasuraUpdates.category = updates.category;
            if (updates.type !== undefined) hasuraUpdates.type = updates.type;
            if (updates.amount !== undefined) hasuraUpdates.amount = updates.amount;
            if (updates.description !== undefined) hasuraUpdates.description = updates.description;
            if (updates.memberId !== undefined) hasuraUpdates.member_id = updates.memberId;
            if (updates.nonMemberName !== undefined) hasuraUpdates.non_member_name = updates.nonMemberName;

            const result = await updateTransactionMutation({
                variables: {
                    id,
                    updates: hasuraUpdates
                }
            });

            if (result.errors && result.errors.length > 0) {
                const errorMessages = result.errors.map(e => e.message).join('; ');
                throw new Error(`Database error: ${errorMessages}`);
            }

            if (!result.data?.update_transactions_by_pk) {
                throw new Error('Transaction could not be updated. The database rejected the operation.');
            }

            await refetch();
        } catch (error: any) {
            console.error('Error updating transaction:', error);
            const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to update transaction. Please check your connection and try again.';
            throw new Error(message);
        }
    };

    const deleteTransaction = async (id: number) => {
        try {
            const result = await deleteTransactionMutation({
                variables: { id }
            });

            if (!result.data?.delete_transactions_by_pk) {
                throw new Error('Failed to delete transaction - no data returned');
            }

            await refetch();
        } catch (error: any) {
            console.error('Error deleting transaction:', error);
            throw new Error(error.message || 'Failed to delete transaction. Please check your connection and try again.');
        }
    };

    // Check if there's a connection error
    const connectionError = error
        ? 'Database connection failed. Please check your network connection and ensure the database server is running.'
        : null;

    return {
        data: transactions,
        setData: (newTransactions: Transaction[]) => {
            console.warn('setData called on Hasura subscription - data is managed by GraphQL');
        },
        loading,
        error: error || connectionError,
        addTransaction,
        updateTransaction,
        deleteTransaction
    };
}
