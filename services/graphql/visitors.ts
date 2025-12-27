
import { gql } from '@apollo/client';

export const GET_VISITORS_QUERY = gql`
  query GetVisitors {
    visitors(order_by: {registered_date: desc}) {
      id
      name
      initials
      phone
      email
      heard_from
      first_visit
      registered_date
      status
      follow_ups(order_by: {date: desc}) {
        id
        visitor_id
        date
        interaction_type
        notes
        next_follow_up_date
        outcome
      }
    }
  }
`;

export const GET_VISITORS_SUBSCRIPTION = gql`
  subscription GetVisitors {
    visitors(order_by: {registered_date: desc}) {
      id
      name
      initials
      phone
      email
      heard_from
      first_visit
      registered_date
      status
      follow_ups(order_by: {date: desc}) {
        id
        visitor_id
        date
        interaction_type
        notes
        next_follow_up_date
        outcome
      }
    }
  }
`;

export const ADD_VISITOR_MUTATION = gql`
  mutation AddVisitor($object: visitors_insert_input!) {
    insert_visitors_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_VISITOR_MUTATION = gql`
  mutation UpdateVisitor($id: Int!, $_set: visitors_set_input!) {
    update_visitors_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
    }
  }
`;

export const DELETE_VISITOR_MUTATION = gql`
  mutation DeleteVisitor($id: Int!) {
    delete_visitors_by_pk(id: $id) {
      id
    }
  }
`;

export const ADD_FOLLOW_UP_MUTATION = gql`
  mutation AddFollowUp($object: follow_ups_insert_input!) {
    insert_follow_ups_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_FOLLOW_UP_MUTATION = gql`
  mutation UpdateFollowUp($id: Int!, $_set: follow_ups_set_input!) {
    update_follow_ups_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
    }
  }
`;

export const DELETE_FOLLOW_UP_MUTATION = gql`
  mutation DeleteFollowUp($id: Int!) {
    delete_follow_ups_by_pk(id: $id) {
      id
    }
  }
`;
