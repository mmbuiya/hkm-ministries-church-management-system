
import { gql } from '@apollo/client';

export const GET_SMS_SUBSCRIPTION = gql`
  subscription GetSmsRecords {
    sms_records(order_by: {date: desc}) {
      id
      recipient_count
      message
      status
      date
    }
  }
`;

export const ADD_SMS_MUTATION = gql`
  mutation AddSmsRecord($object: sms_records_insert_input!) {
    insert_sms_records_one(object: $object) {
      id
    }
  }
`;

export const DELETE_SMS_MUTATION = gql`
  mutation DeleteSmsRecord($id: Int!) {
    delete_sms_records_by_pk(id: $id) {
      id
    }
  }
`;
