import { gql } from '@apollo/client';

export const GET_MESSAGES_SUBSCRIPTION = gql`
  subscription GetMessages {
    messages(order_by: {created_at: desc}) {
      id
      sender_id
      receiver_id
      department
      subject
      body
      status
      created_at
      updated_at
    }
  }
`;

export const ADD_MESSAGE_MUTATION = gql`
  mutation AddMessage($object: messages_insert_input!) {
    insert_messages_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_MESSAGE_MUTATION = gql`
  mutation UpdateMessage($id: uuid!, $updates: messages_set_input!) {
    update_messages_by_pk(pk_columns: {id: $id}, _set: $updates) {
      id
    }
  }
`;

export const DELETE_MESSAGE_MUTATION = gql`
  mutation DeleteMessage($id: uuid!) {
    delete_messages_by_pk(id: $id) {
      id
    }
  }
`;
