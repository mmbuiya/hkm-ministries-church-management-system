
import { gql } from '@apollo/client';

export const GET_ATTENDANCE_QUERY = gql`
  query GetAttendance {
    attendance_records(order_by: {date: desc}) {
      id
      date
      service
      member_id
      status
      member {
        first_name
        last_name
      }
    }
  }
`;

export const GET_ATTENDANCE_SUBSCRIPTION = gql`
  subscription GetAttendance {
    attendance_records(order_by: {date: desc}) {
      id
      date
      service
      member_id
      status
      member {
        first_name
        last_name
      }
    }
  }
`;

export const ADD_ATTENDANCE_MUTATION = gql`
  mutation AddAttendanceRecords($objects: [attendance_records_insert_input!]!) {
    insert_attendance_records(objects: $objects) {
      returning {
        id
      }
    }
  }
`;

export const DELETE_ATTENDANCE_MUTATION = gql`
  mutation DeleteAttendanceRecord($id: Int!) {
    delete_attendance_records_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_ATTENDANCE_BY_SERVICE_MUTATION = gql`
  mutation DeleteAttendanceByService($date: date!, $service: String!) {
    delete_attendance_records(where: {date: {_eq: $date}, service: {_eq: $service}}) {
      affected_rows
    }
  }
`;
