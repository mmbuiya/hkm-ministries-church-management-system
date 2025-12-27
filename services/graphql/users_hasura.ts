
import { gql } from '@apollo/client';

export const GET_USERS_QUERY = gql`
  query GetUsers {
    users(order_by: {username: asc}) {
      id
      username
      email
      role
      avatar
      last_login
      created_at
    }
  }
`;

export const GET_USERS_SUBSCRIPTION = gql`
  subscription GetUsers {
    users(order_by: {username: asc}) {
      id
      username
      email
      role
      avatar
      last_login
      created_at
    }
  }
`;

export const UPSERT_USER_MUTATION = gql`
  mutation UpsertUser($object: users_insert_input!) {
    insert_users_one(
      object: $object,
      on_conflict: {
        constraint: users_pkey,
        update_columns: [username, role, avatar, last_login, updated_at]
      }
    ) {
      id
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser($id: String!) {
    users_by_pk(id: $id) {
      id
      username
      email
      role
      avatar
      last_login
      created_at
    }
  }
`;

export const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: String!) {
    delete_users_by_pk(id: $id) {
      id
    }
  }
`;
