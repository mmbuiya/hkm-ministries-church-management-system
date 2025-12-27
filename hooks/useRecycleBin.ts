
import { useSubscription, useMutation } from '@apollo/client';
import { useMemo } from 'react';
import { RecycleBinItem } from '../components/userData';
import {
    GET_RECYCLE_BIN_SUBSCRIPTION,
    ADD_RECYCLE_BIN_MUTATION,
    DELETE_RECYCLE_BIN_MUTATION
} from '../services/graphql/cleanup';

export function useRecycleBin() {
    const { data, loading, error } = useSubscription(GET_RECYCLE_BIN_SUBSCRIPTION);
    const [addMutation] = useMutation(ADD_RECYCLE_BIN_MUTATION);
    const [deleteMutation] = useMutation(DELETE_RECYCLE_BIN_MUTATION);

    const items: RecycleBinItem[] = useMemo(() => {
        if (!data?.recycle_bin) return [];
        return data.recycle_bin.map((item: any) => ({
            id: item.id,
            originalId: item.original_id,
            type: item.type,
            data: item.data,
            deletedBy: item.deleted_by,
            deletedAt: item.deleted_at,
            reason: item.reason
        }));
    }, [data]);

    const moveToRecycleBin = async (
        type: string,
        originalId: string | number,
        itemData: any,
        deletedBy: string,
        reason?: string
    ) => {
        const id = `${type}_${originalId}_${Date.now()}`;
        await addMutation({
            variables: {
                object: {
                    id,
                    original_id: originalId.toString(),
                    type,
                    data: itemData,
                    deleted_by: deletedBy,
                    reason,
                    deleted_at: new Date().toISOString()
                }
            }
        });
        return id;
    };

    const removeFromRecycleBin = async (id: string) => {
        await deleteMutation({
            variables: { id }
        });
    };

    return {
        data: items,
        loading,
        error,
        moveToRecycleBin,
        removeFromRecycleBin
    };
}
