import { gql } from '@apollo/client';

// Supabase pg_graphql uses Relay-style collections
export const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    membersCollection(orderBy: [{ created_at: DescNullsLast }]) {
      edges {
        node {
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
          avatar
          avatar_transform
          address
          joined_at
          created_at
          occupation
          marital_status
          pin
          is_portal_active
          email_tier
          org_email
        }
      }
    }
  }
`;

export const GET_MEMBERS_SUBSCRIPTION = gql`
  subscription GetMembers {
    membersCollection(orderBy: [{ created_at: DescNullsLast }]) {
      edges {
        node {
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
          avatar
          avatar_transform
          address
          joined_at
          created_at
          occupation
          marital_status
          pin
          is_portal_active
          email_tier
          org_email
        }
      }
    }
  }
`;

export const ADD_MEMBER_MUTATION = gql`
  mutation AddMember($object: membersInsertInput!) {
    insertIntomembersCollection(objects: [$object]) {
      records {
        id
      }
    }
  }
`;

export const UPDATE_MEMBER_MUTATION = gql`
  mutation UpdateMember($id: String!, $updates: membersUpdateInput!) {
    updatemembersCollection(filter: { id: { eq: $id } }, set: $updates) {
      records {
        id
        status
        pin
        is_portal_active
        org_email
      }
    }
  }
`;

export const DELETE_MEMBER_MUTATION = gql`
  mutation DeleteMember($id: String!) {
    deleteFrommembersCollection(filter: { id: { eq: $id } }) {
      records {
        id
      }
    }
  }
`;
