
import { gql } from '@apollo/client';

export const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    members(order_by: {created_at: desc}) {
      id
      first_name
      last_name
      title
      email
      phone
      department
      status
      dob
      gender
      avatar_transform
      address
      joined_at
      created_at
      occupation
      marital_status
    }
  }
`;

export const GET_MEMBERS_SUBSCRIPTION = gql`
  subscription GetMembers {
    members(order_by: {created_at: desc}) {
      id
      first_name
      last_name
      title
      email
      phone
      department
      status
      dob
      gender
      avatar_transform
      address
      joined_at
      created_at
      occupation
      marital_status
    }
  }
`;

export const ADD_MEMBER_MUTATION = gql`
  mutation AddMember($object: members_insert_input!) {
    insert_members_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_MEMBER_MUTATION = gql`
  mutation UpdateMember($id: String!, $updates: members_set_input!) {
    update_members_by_pk(pk_columns: {id: $id}, _set: $updates) {
      id
    }
  }
`;

export const DELETE_MEMBER_MUTATION = gql`
  mutation DeleteMember($id: String!) {
    delete_members_by_pk(id: $id) {
      id
    }
  }
`;
