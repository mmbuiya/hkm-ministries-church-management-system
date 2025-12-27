
import { gql } from '@apollo/client';

export const GET_EQUIPMENT_QUERY = gql`
  query GetEquipment {
    equipment(order_by: {name: asc}) {
      id
      name
      category
      purchase_date
      purchase_price
      condition
      location
      description
      maintenance_records(order_by: {date: desc}) {
        id
        equipment_id
        date
        type
        cost
        description
        status
      }
    }
  }
`;

export const GET_EQUIPMENT_SUBSCRIPTION = gql`
  subscription GetEquipment {
    equipment(order_by: {name: asc}) {
      id
      name
      category
      purchase_date
      purchase_price
      condition
      location
      description
      maintenance_records(order_by: {date: desc}) {
        id
        equipment_id
        date
        type
        cost
        description
        status
      }
    }
  }
`;

export const ADD_EQUIPMENT_MUTATION = gql`
  mutation AddEquipment($object: equipment_insert_input!) {
    insert_equipment_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_EQUIPMENT_MUTATION = gql`
  mutation UpdateEquipment($id: Int!, $_set: equipment_set_input!) {
    update_equipment_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
    }
  }
`;

export const DELETE_EQUIPMENT_MUTATION = gql`
  mutation DeleteEquipment($id: Int!) {
    delete_equipment_by_pk(id: $id) {
      id
    }
  }
`;

export const ADD_MAINTENANCE_MUTATION = gql`
  mutation AddMaintenance($object: maintenance_records_insert_input!) {
    insert_maintenance_records_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_MAINTENANCE_MUTATION = gql`
  mutation UpdateMaintenance($id: Int!, $_set: maintenance_records_set_input!) {
    update_maintenance_records_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
    }
  }
`;

export const DELETE_MAINTENANCE_MUTATION = gql`
  mutation DeleteMaintenance($id: Int!) {
    delete_maintenance_records_by_pk(id: $id) {
      id
    }
  }
`;
