
import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Transaction } from '../components/financeData';
import {
    GET_TRANSACTIONS_QUERY,
    ADD_TRANSACTION_MUTATION,
    UPDATE_TRANSACTION_MUTATION,
    DELETE_TRANSACTION_MUTATION
} from '../services/graphql/transactions';

interface HasuraTransaction {
    id: number;
    date: string;
    category: string;
    type: 'Income' | 'Expense';
    amount: number;
    description?: string;
    member_id?: string;
    non_member_name?: string;
}

function transformTransaction(hasuraTx: HasuraTransaction): Transaction {
    return {
        id: hasuraTx.id,
        date: hasuraTx.date,
        category: hasuraTx.category as any,
        type: hasuraTx.type,
        amount: parseFloat(hasuraTx.amount.toString()),
        description: hasuraTx.description || '',
        memberId: hasuraTx.member_id,
        nonMemberName: hasuraTx.non_member_name
    };
}

export function useTransactions() {
    const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
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
        await addTransactionMutation({
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
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
        const hasuraUpdates: any = {};

        if (updates.date !== undefined) hasuraUpdates.date = updates.date;
        if (updates.category !== undefined) hasuraUpdates.category = updates.category;
        if (updates.type !== undefined) hasuraUpdates.type = updates.type;
        if (updates.amount !== undefined) hasuraUpdates.amount = updates.amount;
        if (updates.description !== undefined) hasuraUpdates.description = updates.description;
        if (updates.memberId !== undefined) hasuraUpdates.member_id = updates.memberId;
        if (updates.nonMemberName !== undefined) hasuraUpdates.non_member_name = updates.nonMemberName;

        await updateTransactionMutation({
            variables: {
                id,
                updates: hasuraUpdates
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteTransaction = async (id: number) => {
        await deleteTransactionMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        data: transactions,
        setData: (newTransactions: Transaction[]) => {
            console.warn('setData called on Hasura subscription - data is managed by GraphQL');
        },
        loading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction
    };
}
