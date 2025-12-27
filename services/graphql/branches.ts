
import { gql } from '@apollo/client';

export const GET_BRANCHES_QUERY = gql`
  query GetBranches {
    branches(order_by: {name: asc}) {
      id
      name
      location
      manager_id
      phone
      email
      is_active
      created_at
      updated_at
    }
  }
`;

export const GET_BRANCHES_SUBSCRIPTION = gql`
  subscription GetBranches {
    branches(order_by: {name: asc}) {
      id
      name
      location
      manager_id
      phone
      email
      is_active
      created_at
      updated_at
    }
  }
`;

export const ADD_BRANCH_MUTATION = gql`
  mutation AddBranch($object: branches_insert_input!) {
    insert_branches_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_BRANCH_MUTATION = gql`
  mutation UpdateBranch($id: String!, $changes: branches_set_input!) {
    update_branches_by_pk(pk_columns: {id: $id}, _set: $changes) {
      id
    }
  }
`;

export const DELETE_BRANCH_MUTATION = gql`
  mutation DeleteBranch($id: String!) {
    delete_branches_by_pk(id: $id) {
      id
    }
  }
`;
