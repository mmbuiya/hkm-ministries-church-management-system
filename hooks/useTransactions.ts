import { useMemo } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { Transaction } from '../components/financeData';
import {
  GET_TRANSACTIONS_QUERY,
  ADD_TRANSACTION_MUTATION,
  UPDATE_TRANSACTION_MUTATION,
  DELETE_TRANSACTION_MUTATION,
} from '../services/graphql/transactions';
import { UPDATE_MEMBER_MUTATION, GET_MEMBERS_QUERY } from '../services/graphql/members';
import { sendPinNotification } from '../services/pinNotificationService';
import { hashPin } from '../utils/hashPin';

interface SupabaseMember {
  id: string;
  first_name: string;
  last_name: string;
  department?: string;
  phone?: string;
  email?: string;
  status?: string;
}

interface SupabaseTransaction {
  id: number;
  date: string;
  category: string;
  type: 'Income' | 'Expense';
  amount: number;
  description?: string;
  member_id?: string;
  non_member_name?: string;
  member?: SupabaseMember | null;
}

function transformTransaction(SupabaseTx: SupabaseTransaction): Transaction {
  let contributorName: string | undefined;
  let contributorPhone: string | undefined;

  if (SupabaseTx.member) {
    contributorName = `${SupabaseTx.member.first_name} ${SupabaseTx.member.last_name}`.trim();
    contributorPhone = SupabaseTx.member.phone;
  } else if (SupabaseTx.non_member_name) {
    contributorName = SupabaseTx.non_member_name;
  }

  return {
    id: SupabaseTx.id,
    date: SupabaseTx.date,
    category: SupabaseTx.category as any,
    type: SupabaseTx.type,
    amount: parseFloat(SupabaseTx.amount.toString()),
    description: SupabaseTx.description || '',
    memberId: SupabaseTx.member_id,
    nonMemberName: SupabaseTx.non_member_name,
    contributorName,
    contributorPhone,
  };
}

export function useTransactions() {
  // Calculate the date 6 months ago to limit data fetched
  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  }, []);

  const { data, loading, error } = useQuery(GET_TRANSACTIONS_QUERY, {
    fetchPolicy: 'network-only',
    pollInterval: 5000,
    errorPolicy: 'all',
  });
  const apolloClient = useApolloClient();
  const [addTransactionMutation] = useMutation(ADD_TRANSACTION_MUTATION);
  const [updateTransactionMutation] = useMutation(UPDATE_TRANSACTION_MUTATION);
  const [deleteTransactionMutation] = useMutation(DELETE_TRANSACTION_MUTATION);
  const [updateMemberMutation] = useMutation(UPDATE_MEMBER_MUTATION);

  const transactions: Transaction[] = useMemo(() => {
    console.log('[useTransactions] Query data:', data, 'Error:', error);
    if (!data?.transactions) {
      console.warn('[useTransactions] No transactions in data', { data, loading, error });
      return [];
    }
    console.log('[useTransactions] Transactions count:', data.transactions.length);
    return data.transactions.map(transformTransaction);
  }, [data, error, loading]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'> | Transaction) => {
    console.log('[useTransactions] addTransaction called', {
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount,
      memberId: transaction.memberId,
    });
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
            non_member_name: transaction.nonMemberName || null,
          },
        },
      });

      console.log('[useTransactions] Mutation result:', result);

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join('; ');
        console.error('[useTransactions] GraphQL errors:', result.errors);
        throw new Error(`Database error: ${errorMessages}`);
      }

      if (!result.data?.insert_transactions_one) {
        console.error('[useTransactions] No insert_transactions_one in result', { data: result.data });
        throw new Error('Transaction could not be saved. The database rejected the operation.');
      }

      // --- Payment-Gated Activation Logic ---
      if (transaction.category === 'Registration Fee' && transaction.memberId) {
        console.log('[useTransactions] Registration Fee detected. Generating PIN and activating member portal...');

        // Generate a random 6-digit PIN
        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash it before storing to DB
        const hashedPin = await hashPin(transaction.memberId, generatedPin);

        await updateMemberMutation({
          variables: {
            id: transaction.memberId,
            updates: {
              status: 'Active',
              pin: hashedPin,
              is_portal_active: true,
            },
          },
        });
        console.log('[useTransactions] Member activated with new PIN.');

        // Fetch member details to send notification
        try {
          const memberResult = await apolloClient.query({
            query: GET_MEMBERS_QUERY,
            fetchPolicy: 'network-only',
          });

          const memberNode = memberResult.data?.membersCollection?.edges?.find(
            (e: any) => e.node.id === transaction.memberId,
          )?.node;

          if (memberNode) {
            await sendPinNotification({
              memberId: memberNode.id,
              memberName: `${memberNode.first_name} ${memberNode.last_name}`.trim(),
              phone: memberNode.phone,
              email: memberNode.email,
              pin: generatedPin,
            });
          } else {
            console.warn('[useTransactions] Could not find member details for PIN notification.');
          }
        } catch (notifErr) {
          console.error('[useTransactions] Error sending PIN notification:', notifErr);
        }
      }

      console.log('[useTransactions] Mutation succeeded');
    } catch (error: any) {
      console.error('[useTransactions] Error adding transaction:', error);
      const message =
        error.graphQLErrors?.[0]?.message ||
        error.message ||
        'Failed to save transaction. Please check your connection and try again.';
      console.error('[useTransactions] Throwing error:', message);
      throw new Error(message, { cause: error });
    }
  };

  const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
    try {
      const SupabaseUpdates: any = {};

      if (updates.date !== undefined) SupabaseUpdates.date = updates.date;
      if (updates.category !== undefined) SupabaseUpdates.category = updates.category;
      if (updates.type !== undefined) SupabaseUpdates.type = updates.type;
      if (updates.amount !== undefined) SupabaseUpdates.amount = updates.amount;
      if (updates.description !== undefined) SupabaseUpdates.description = updates.description;
      if (updates.memberId !== undefined) SupabaseUpdates.member_id = updates.memberId;
      if (updates.nonMemberName !== undefined) SupabaseUpdates.non_member_name = updates.nonMemberName;

      const result = await updateTransactionMutation({
        variables: {
          id,
          updates: SupabaseUpdates,
        },
      });

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join('; ');
        throw new Error(`Database error: ${errorMessages}`);
      }

      if (!result.data?.update_transactions_by_pk) {
        throw new Error('Transaction could not be updated. The database rejected the operation.');
      }

      // Real-time subscription will update UI automatically
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      const message =
        error.graphQLErrors?.[0]?.message ||
        error.message ||
        'Failed to update transaction. Please check your connection and try again.';
      throw new Error(message, { cause: error });
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      const result = await deleteTransactionMutation({
        variables: { id },
      });

      if (!result.data?.delete_transactions_by_pk) {
        throw new Error('Failed to delete transaction - no data returned');
      }

      // Real-time subscription will update UI automatically
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      throw new Error(error.message || 'Failed to delete transaction. Please check your connection and try again.', {
        cause: error,
      });
    }
  };

  // Check if there's a connection error
  const connectionError = error
    ? 'Database connection failed. Please check your network connection and ensure the database server is running.'
    : null;

  return {
    data: transactions,
    setData: (newTransactions: Transaction[]) => {
      console.warn('setData called on Supabase subscription - data is managed by GraphQL');
    },
    loading,
    error: error || connectionError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
