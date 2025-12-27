
import { gql } from '@apollo/client';

// Recycle Bin
export const GET_RECYCLE_BIN_SUBSCRIPTION = gql`
  subscription GetRecycleBin {
    recycle_bin(order_by: {deleted_at: desc}) {
      id
      original_id
      type
      data
      deleted_by
      deleted_at
      reason
    }
  }
`;

export const ADD_RECYCLE_BIN_MUTATION = gql`
  mutation AddRecycleBin($object: recycle_bin_insert_input!) {
    insert_recycle_bin_one(object: $object) {
      id
    }
  }
`;

export const DELETE_RECYCLE_BIN_MUTATION = gql`
  mutation DeleteRecycleBin($id: String!) {
    delete_recycle_bin_by_pk(id: $id) {
      id
    }
  }
`;

// Permission Requests
export const GET_PERMISSION_REQUESTS_SUBSCRIPTION = gql`
  subscription GetPermissionRequests {
    permission_requests(order_by: {requested_at: desc}) {
      id
      requester_id
      requester_name
      requester_email
      request_type
      data_type
      data_id
      data_name
      reason
      requested_at
      status
      reviewed_by
      reviewed_at
      review_notes
      expires_at
    }
  }
`;

export const ADD_PERMISSION_REQUEST_MUTATION = gql`
  mutation AddPermissionRequest($object: permission_requests_insert_input!) {
    insert_permission_requests_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_PERMISSION_REQUEST_MUTATION = gql`
  mutation UpdatePermissionRequest($id: String!, $changes: permission_requests_set_input!) {
    update_permission_requests_by_pk(pk_columns: {id: $id}, _set: $changes) {
      id
    }
  }
`;

export const DELETE_PERMISSION_REQUEST_MUTATION = gql`
  mutation DeletePermissionRequest($id: String!) {
    delete_permission_requests_by_pk(id: $id) {
      id
    }
  }
`;

// User Sessions
export const GET_USER_SESSIONS_QUERY = gql`
  query GetUserSessions {
    user_sessions(order_by: {login_time: desc}) {
      id
      user_id
      user_email
      user_name
      user_role
      login_time
      logout_time
      is_active
      ip_address
      user_agent
      location
      session_duration
      last_activity
    }
  }
`;

export const GET_USER_SESSIONS_SUBSCRIPTION = gql`
  subscription GetUserSessions {
    user_sessions(order_by: {login_time: desc}) {
      id
      user_id
      user_email
      user_name
      user_role
      login_time
      logout_time
      is_active
      ip_address
      user_agent
      location
      session_duration
      last_activity
    }
  }
`;

export const ADD_USER_SESSION_MUTATION = gql`
  mutation AddUserSession($object: user_sessions_insert_input!) {
    insert_user_sessions_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_USER_SESSION_MUTATION = gql`
  mutation UpdateUserSession($id: String!, $changes: user_sessions_set_input!) {
    update_user_sessions_by_pk(pk_columns: {id: $id}, _set: $changes) {
      id
    }
  }
`;

export const END_USER_SESSION_MUTATION = gql`
  mutation EndUserSession($id: String!, $logout_time: timestamptz!) {
    update_user_sessions_by_pk(
      pk_columns: {id: $id}, 
      _set: {logout_time: $logout_time, is_active: false}
    ) {
      id
    }
  }
`;

// Login Attempts
export const GET_LOGIN_ATTEMPTS_QUERY = gql`
  query GetLoginAttempts {
    login_attempts(order_by: {timestamp: desc}) {
      id
      email
      timestamp
      success
      failure_reason
      ip_address
      user_agent
      location
    }
  }
`;

export const GET_LOGIN_ATTEMPTS_SUBSCRIPTION = gql`
  subscription GetLoginAttempts {
    login_attempts(order_by: {timestamp: desc}) {
      id
      email
      timestamp
      success
      failure_reason
      ip_address
      user_agent
      location
    }
  }
`;

export const ADD_LOGIN_ATTEMPT_MUTATION = gql`
  mutation AddLoginAttempt($object: login_attempts_insert_input!) {
    insert_login_attempts_one(object: $object) {
      id
    }
  }
`;
