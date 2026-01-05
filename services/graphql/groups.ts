
import { gql } from '@apollo/client';

export const GET_GROUPS_SUBSCRIPTION = gql`
  subscription GetGroups {
    groups(order_by: {name: asc}) {
      id
      name
      leader_id
      member_count
      created_at
      category
      leader {
        first_name
        last_name
        email
      }
    }
  }
`;

export const ADD_GROUP_MUTATION = gql`
  mutation AddGroup($object: groups_insert_input!) {
    insert_groups_one(object: $object) {
      id
      name
      category
    }
  }
`;

export const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroup($id: Int!, $_set: groups_set_input!) {
    update_groups_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
      name
      category
    }
  }
`;

export const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($id: Int!) {
    delete_groups_by_pk(id: $id) {
      id
    }
  }
`;
