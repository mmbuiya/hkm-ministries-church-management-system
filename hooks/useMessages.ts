import { useSubscription, useMutation } from '@apollo/client';
import { useMemo } from 'react';
import {
  GET_MESSAGES_SUBSCRIPTION,
  ADD_MESSAGE_MUTATION,
  UPDATE_MESSAGE_MUTATION,
  DELETE_MESSAGE_MUTATION,
} from '../services/graphql/messages';

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  department?: string;
  subject: string;
  body: string;
  status: 'Unread' | 'Read' | 'Resolved';
  createdAt: string;
  updatedAt: string;
}

interface SupabaseMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  department?: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useMessages() {
  const { data, loading, error } = useSubscription(GET_MESSAGES_SUBSCRIPTION);
  const [addMessageMutation] = useMutation(ADD_MESSAGE_MUTATION);
  const [updateMessageMutation] = useMutation(UPDATE_MESSAGE_MUTATION);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE_MUTATION);

  const messages: Message[] = useMemo(() => {
    if (!data?.messages) return [];
    return data.messages.map((msg: SupabaseMessage) => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      department: msg.department,
      subject: msg.subject,
      body: msg.body,
      status: msg.status as Message['status'],
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
    }));
  }, [data]);

  const addMessage = async (msg: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addMessageMutation({
      variables: {
        object: {
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          department: msg.department,
          subject: msg.subject,
          body: msg.body,
          status: msg.status || 'Unread',
        },
      },
    });
  };

  const updateMessage = async (id: string, updates: Partial<Message>) => {
    const SupabaseUpdates: any = {};
    if (updates.status) SupabaseUpdates.status = updates.status;
    if (updates.body) SupabaseUpdates.body = updates.body;
    if (updates.receiverId !== undefined) SupabaseUpdates.receiver_id = updates.receiverId;

    await updateMessageMutation({
      variables: { id, updates: SupabaseUpdates },
    });
  };

  const deleteMessage = async (id: string) => {
    await deleteMessageMutation({ variables: { id } });
  };

  return {
    messages,
    loading,
    error,
    addMessage,
    updateMessage,
    deleteMessage,
  };
}
