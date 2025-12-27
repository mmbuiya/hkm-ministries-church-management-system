
import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Equipment, EquipmentCondition } from '../components/equipmentData';
import { MaintenanceRecord, MaintenanceStatus, MaintenanceType } from '../components/maintenanceData';
import {
    GET_EQUIPMENT_QUERY,
    ADD_EQUIPMENT_MUTATION,
    UPDATE_EQUIPMENT_MUTATION,
    DELETE_EQUIPMENT_MUTATION,
    ADD_MAINTENANCE_MUTATION,
    UPDATE_MAINTENANCE_MUTATION,
    DELETE_MAINTENANCE_MUTATION
} from '../services/graphql/equipment';

export function useEquipment() {
    const { data, loading, error, refetch } = useQuery(GET_EQUIPMENT_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addEquipmentMutation] = useMutation(ADD_EQUIPMENT_MUTATION);
    const [updateEquipmentMutation] = useMutation(UPDATE_EQUIPMENT_MUTATION);
    const [deleteEquipmentMutation] = useMutation(DELETE_EQUIPMENT_MUTATION);
    const [addMaintenanceMutation] = useMutation(ADD_MAINTENANCE_MUTATION);
    const [updateMaintenanceMutation] = useMutation(UPDATE_MAINTENANCE_MUTATION);
    const [deleteMaintenanceMutation] = useMutation(DELETE_MAINTENANCE_MUTATION);

    const equipment: Equipment[] = useMemo(() => {
        if (!data?.equipment) return [];
        return data.equipment.map((e: any) => ({
            id: e.id,
            name: e.name,
            category: e.category || 'Other',
            purchaseDate: e.purchase_date || undefined,
            purchasePrice: e.purchase_price ? Number(e.purchase_price) : undefined,
            condition: e.condition as EquipmentCondition,
            location: e.location || '',
            description: e.description || ''
        }));
    }, [data]);

    const maintenanceRecords: MaintenanceRecord[] = useMemo(() => {
        if (!data?.equipment) return [];
        const allRecords: MaintenanceRecord[] = [];
        data.equipment.forEach((e: any) => {
            if (e.maintenance_records) {
                e.maintenance_records.forEach((m: any) => {
                    allRecords.push({
                        id: m.id,
                        equipmentId: m.equipment_id,
                        date: m.date,
                        type: m.type as MaintenanceType,
                        cost: m.cost ? Number(m.cost) : 0,
                        description: m.description || '',
                        status: m.status as MaintenanceStatus
                    });
                });
            }
        });
        return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data]);

    const addEquipment = async (item: Partial<Equipment>) => {
        await addEquipmentMutation({
            variables: {
                object: {
                    name: item.name || '',
                    category: item.category,
                    purchase_date: item.purchaseDate,
                    purchase_price: item.purchasePrice,
                    condition: item.condition,
                    location: item.location,
                    description: item.description
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateEquipment = async (id: number, updates: Partial<Equipment>) => {
        const set: any = {};
        if (updates.name) set.name = updates.name;
        if (updates.category) set.category = updates.category;
        if (updates.purchaseDate) set.purchase_date = updates.purchaseDate;
        if (updates.purchasePrice !== undefined) set.purchase_price = updates.purchasePrice;
        if (updates.condition) set.condition = updates.condition;
        if (updates.location) set.location = updates.location;
        if (updates.description) set.description = updates.description;

        await updateEquipmentMutation({
            variables: { id, _set: set }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteEquipment = async (id: number) => {
        await deleteEquipmentMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const addMaintenance = async (record: Omit<MaintenanceRecord, 'id'>) => {
        await addMaintenanceMutation({
            variables: {
                object: {
                    equipment_id: record.equipmentId,
                    date: record.date,
                    type: record.type,
                    cost: record.cost,
                    description: record.description,
                    status: record.status
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateMaintenance = async (id: number, updates: Partial<MaintenanceRecord>) => {
        const set: any = {};
        if (updates.date) set.date = updates.date;
        if (updates.type) set.type = updates.type;
        if (updates.cost !== undefined) set.cost = updates.cost;
        if (updates.description) set.description = updates.description;
        if (updates.status) set.status = updates.status;

        await updateMaintenanceMutation({
            variables: { id, _set: set }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteMaintenance = async (id: number) => {
        await deleteMaintenanceMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        equipment,
        maintenanceRecords,
        loading,
        error,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance
    };
}
