import { gql } from '@apollo/client';

export const PORTAL_LOGIN_QUERY = gql`
  query PortalLogin($id: String!, $pin: String!) {
    membersCollection(filter: { id: { eq: $id }, pin: { eq: $pin }, is_portal_active: { eq: true } }, first: 1) {
      edges {
        node {
          id
          first_name
          last_name
          email
          phone
          department
          status
          joined_at
          is_portal_active
        }
      }
    }
  }
`;

export const GET_MEMBER_DASHBOARD_QUERY = gql`
  query GetMemberDashboard($memberId: String!) {
    membersCollection(filter: { id: { eq: $memberId } }, first: 1) {
      edges {
        node {
          id
          first_name
          last_name
          email
          phone
          department
          status
          joined_at
          gender
          marital_status
          address
          occupation
          dob
          is_portal_active
        }
      }
    }
    transactionsCollection(
      filter: { member_id: { eq: $memberId }, type: { eq: "Income" } }
      orderBy: [{ date: DescNullsLast }]
    ) {
      edges {
        node {
          id
          date
          category
          amount
          description
        }
      }
    }
    attendance_recordsCollection(filter: { member_id: { eq: $memberId } }, orderBy: [{ date: DescNullsLast }]) {
      edges {
        node {
          id
          date
          service
          status
        }
      }
    }
  }
`;

export const GET_MEMBER_PROFILE_QUERY = gql`
  query GetMemberProfile($memberId: String!) {
    membersCollection(filter: { id: { eq: $memberId } }, first: 1) {
      edges {
        node {
          id
          first_name
          last_name
          email
          phone
          address
          occupation
          marital_status
          dob
        }
      }
    }
  }
`;

export const UPDATE_MEMBER_PROFILE_MUTATION = gql`
  mutation UpdateMemberProfile($id: String!, $updates: membersUpdateInput!) {
    updatemembersCollection(filter: { id: { eq: $id } }, set: $updates) {
      records {
        id
      }
    }
  }
`;

export const SUBMIT_HELPDESK_TICKET_MUTATION = gql`
  mutation SubmitHelpdeskTicket($sender_id: String!, $department: String, $subject: String!, $body: String!) {
    insertIntomessagesCollection(
      objects: [{ sender_id: $sender_id, department: $department, subject: $subject, body: $body, status: "unread" }]
    ) {
      records {
        id
      }
    }
  }
`;
