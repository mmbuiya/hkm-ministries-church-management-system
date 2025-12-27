
import { gql } from '@apollo/client';

export const GET_TRANSACTIONS_QUERY = gql`
  query GetTransactions {
    transactions(order_by: {created_at: desc}) {
      id
      date
      category
      type
      amount
      description
      member_id
      non_member_name
      created_at
      updated_at
    }
  }
`;

export const GET_TRANSACTIONS_SUBSCRIPTION = gql`
  subscription GetTransactions {
    transactions(order_by: {created_at: desc}) {
      id
      date
      category
      type
      amount
      description
      member_id
      non_member_name
      created_at
      updated_at
    }
  }
`;

export const ADD_TRANSACTION_MUTATION = gql`
  mutation AddTransaction($object: transactions_insert_input!) {
    insert_transactions_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_TRANSACTION_MUTATION = gql`
  mutation UpdateTransaction($id: Int!, $updates: transactions_set_input!) {
    update_transactions_by_pk(pk_columns: {id: $id}, _set: $updates) {
      id
    }
  }
`;

export const DELETE_TRANSACTION_MUTATION = gql`
  mutation DeleteTransaction($id: Int!) {
    delete_transactions_by_pk(id: $id) {
      id
    }
  }
`;
