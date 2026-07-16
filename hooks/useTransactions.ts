import { useMemo } from 'react';
import { useSubscription, useMutation, useQuery, useApolloClient } from '@apollo/client';
import { Transaction } from '../components/financeData';
import {
  GET_TRANSACTIONS_QUERY,
  GET_TRANSACTIONS_SUBSCRIPTION,
  ADD_TRANSACTION_MUTATION,
  UPDATE_TRANSACTION_MUTATION,
  DELETE_TRANSACTION_MUTATION,
  ADD_AUDIT_LOG_MUTATION,
  ADD_NOTIFICATION_LOG_MUTATION,
} from '../services/graphql/transactions';
import { UPDATE_MEMBER_MUTATION, GET_MEMBERS_QUERY } from '../services/graphql/members';
import { sendPinNotification } from '../services/pinNotificationService';
import { hashPin } from '../utils/hashPin';
import { generateOrgEmail, createAlias, loadImprovMXConfig, checkAliasExists } from '../services/improvmxService';
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

  const { data: queryData, loading: queryLoading } = useQuery(GET_TRANSACTIONS_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const {
    data: subData,
    loading: subLoading,
    error,
  } = useSubscription(GET_TRANSACTIONS_SUBSCRIPTION, {
    variables: { startDate: sixMonthsAgo },
    errorPolicy: 'all',
  });

  const data = subData ?? queryData;
  const loading = subData === undefined && queryLoading;
  const apolloClient = useApolloClient();
  const [addTransactionMutation] = useMutation(ADD_TRANSACTION_MUTATION);
  const [updateTransactionMutation] = useMutation(UPDATE_TRANSACTION_MUTATION);
  const [deleteTransactionMutation] = useMutation(DELETE_TRANSACTION_MUTATION);
  const [updateMemberMutation] = useMutation(UPDATE_MEMBER_MUTATION);
  const [addAuditLogMutation] = useMutation(ADD_AUDIT_LOG_MUTATION);
  const [addNotificationLogMutation] = useMutation(ADD_NOTIFICATION_LOG_MUTATION);

  const transactions: Transaction[] = useMemo(() => {
    console.log('[useTransactions] Query data:', data, 'Error:', error);
    if (!data?.transactionsCollection?.edges) {
      console.warn('[useTransactions] No transactions in data', { data, loading, error });
      return [];
    }
    console.log('[useTransactions] Transactions count:', data.transactionsCollection.edges.length);
    return data.transactionsCollection.edges.map((edge: { node: SupabaseTransaction }) =>
      transformTransaction(edge.node),
    );
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
            amount: transaction.amount.toString(), // BigFloat requires string
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

      const insertedRecords = result.data?.insertIntotransactionsCollection?.records;
      if (!insertedRecords || insertedRecords.length === 0) {
        console.error('[useTransactions] No records returned from insert', { data: result.data });
        throw new Error('Transaction could not be saved. The database rejected the operation.');
      }

      // --- Payment-Gated Activation Logic ---
      if (transaction.category === 'Registration Fee' && transaction.memberId) {
        const previousRegistrationFees = transactions
          .filter((t) => t.memberId === transaction.memberId && t.category === 'Registration Fee')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalRegistrationPaid = previousRegistrationFees + transaction.amount;

        if (totalRegistrationPaid >= 500) {
          console.log(
            '[useTransactions] Registration threshold met (500). Generating PIN and activating member portal...',
          );

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

          try {
            await addAuditLogMutation({
              variables: {
                object: {
                  action: 'Member Activated',
                  entity_type: 'member',
                  entity_id: transaction.memberId,
                  details: { reason: 'Registration threshold met', amount: totalRegistrationPaid },
                },
              },
            });
          } catch (auditErr) {
            console.error('Failed to write audit log', auditErr);
          }

          // Fetch member details to send notification and create org email
          try {
            const memberResult = await apolloClient.query({
              query: GET_MEMBERS_QUERY,
              fetchPolicy: 'network-only',
            });

            const memberNode = memberResult.data?.membersCollection?.edges?.find(
              (e: any) => e.node.id === transaction.memberId,
            )?.node;

            if (memberNode) {
              // --- Org Email Alias Creation ---
              const memberName = `${memberNode.first_name} ${memberNode.last_name}`.trim();
              const emailTier = memberNode.email_tier || 'member';
              let orgEmail = memberNode.org_email;

              if (!orgEmail) {
                const config = loadImprovMXConfig();
                const baseEmail = generateOrgEmail(memberName, config.domain || 'hkmministries.org');
                orgEmail = baseEmail;

                // Ensure uniqueness
                if (config.apiKey) {
                  let isUnique = false;
                  let attempts = 0;
                  while (!isUnique && attempts < 5) {
                    const checkResult = await checkAliasExists(orgEmail);
                    if (!checkResult.exists) {
                      isUnique = true; // Not found, so it's unique
                    } else {
                      // It exists, append random 3 digits
                      const randomDigits = Math.floor(100 + Math.random() * 900);
                      const parts = baseEmail.split('@');
                      orgEmail = `${parts[0]}.${randomDigits}@${parts[1]}`;
                    }
                    attempts++;
                  }
                }

                if (emailTier === 'member') {
                  const aliasResult = await createAlias(orgEmail, memberNode.email || '');
                  if (aliasResult.success) {
                    await updateMemberMutation({
                      variables: {
                        id: transaction.memberId,
                        updates: { org_email: orgEmail },
                      },
                    });
                    console.log(`[useTransactions] Org email ${orgEmail} created and saved.`);
                  } else {
                    console.error('[useTransactions] Failed to create alias:', aliasResult.error);
                  }
                } else if (emailTier === 'leadership') {
                  try {
                    await addAuditLogMutation({
                      variables: {
                        object: {
                          action: 'Leadership Email Required',
                          entity_type: 'member',
                          entity_id: transaction.memberId,
                          details: {
                            note: 'Leadership member — set up Google Workspace Gmail manually',
                            org_email: orgEmail,
                          },
                        },
                      },
                    });
                  } catch (auditErr) {
                    console.error('Failed to write audit log for leadership email notice', auditErr);
                  }
                }
              }

              const notifResult = await sendPinNotification({
                memberId: memberNode.id,
                memberName,
                phone: memberNode.phone,
                email: memberNode.email,
                pin: generatedPin,
                orgEmail: orgEmail,
              });

              // Log SMS result
              try {
                await addNotificationLogMutation({
                  variables: {
                    object: {
                      member_id: memberNode.id,
                      channel: 'sms',
                      recipient: memberNode.phone || 'None',
                      status: notifResult.sms.sent ? 'success' : 'failed',
                      error_message: notifResult.sms.error || null,
                    },
                  },
                });
              } catch (err) {
                console.error('Failed to log SMS notif', err);
              }

              // Log Email result
              try {
                await addNotificationLogMutation({
                  variables: {
                    object: {
                      member_id: memberNode.id,
                      channel: 'email',
                      recipient: memberNode.email || 'None',
                      status: notifResult.email.sent ? 'success' : 'failed',
                      error_message: notifResult.email.error || null,
                    },
                  },
                });
              } catch (err) {
                console.error('Failed to log Email notif', err);
              }
            } else {
              console.warn('[useTransactions] Could not find member details for PIN notification.');
            }
          } catch (notifErr) {
            console.error('[useTransactions] Error sending PIN notification:', notifErr);
          }
        } else {
          console.log(
            `[useTransactions] Partial Registration Fee. Total paid: ${totalRegistrationPaid}. Pending 500 threshold.`,
          );
          try {
            await addAuditLogMutation({
              variables: {
                object: {
                  action: 'Partial Fee Paid',
                  entity_type: 'member',
                  entity_id: transaction.memberId,
                  details: { amount_paid: transaction.amount, total_paid: totalRegistrationPaid },
                },
              },
            });
          } catch (auditErr) {
            console.error('Failed to write audit log', auditErr);
          }
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
      if (updates.amount !== undefined) SupabaseUpdates.amount = updates.amount.toString(); // BigFloat requires string
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

      const updatedRecords = result.data?.updatetransactionsCollection?.records;
      if (!updatedRecords || updatedRecords.length === 0) {
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
