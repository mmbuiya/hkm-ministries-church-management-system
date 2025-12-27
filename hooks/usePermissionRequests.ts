
import { useSubscription, useMutation } from '@apollo/client';
import { useMemo } from 'react';
import { PermissionRequest } from '../components/PermissionRequest';
import {
    GET_PERMISSION_REQUESTS_SUBSCRIPTION,
    ADD_PERMISSION_REQUEST_MUTATION,
    UPDATE_PERMISSION_REQUEST_MUTATION,
    DELETE_PERMISSION_REQUEST_MUTATION
} from '../services/graphql/cleanup';

export function usePermissionRequests() {
    const { data, loading, error } = useSubscription(GET_PERMISSION_REQUESTS_SUBSCRIPTION);
    const [addMutation] = useMutation(ADD_PERMISSION_REQUEST_MUTATION);
    const [updateMutation] = useMutation(UPDATE_PERMISSION_REQUEST_MUTATION);
    const [deleteMutation] = useMutation(DELETE_PERMISSION_REQUEST_MUTATION);

    const requests: PermissionRequest[] = useMemo(() => {
        if (!data?.permission_requests) return [];
        return data.permission_requests.map((r: any) => ({
            id: r.id,
            requesterId: r.requester_id,
            requesterName: r.requester_name,
            requesterEmail: r.requester_email,
            requestType: r.request_type,
            dataType: r.data_type,
            dataId: r.data_id,
            dataName: r.data_name,
            reason: r.reason,
            requestedAt: r.requested_at,
            status: r.status,
            reviewedBy: r.reviewed_by,
            reviewedAt: r.reviewed_at,
            reviewNotes: r.review_notes,
            expiresAt: r.expires_at
        }));
    }, [data]);

    const addRequest = async (request: Omit<PermissionRequest, 'id' | 'requestedAt' | 'status'>) => {
        const id = `${request.requestType}_${request.dataType}_${request.dataId}_${Date.now()}`;
        await addMutation({
            variables: {
                object: {
                    id,
                    requester_id: request.requesterId,
                    requester_name: request.requesterName,
                    requester_email: request.requesterEmail,
                    request_type: request.requestType,
                    data_type: request.dataType,
                    data_id: request.dataId.toString(),
                    data_name: request.dataName,
                    reason: request.reason,
                    status: 'pending',
                    requested_at: new Date().toISOString()
                }
            }
        });
    };

    const updateRequest = async (id: string, changes: Partial<PermissionRequest>) => {
        const mappedChanges: any = {};
        if (changes.status) mappedChanges.status = changes.status;
        if (changes.reviewedBy) mappedChanges.reviewed_by = changes.reviewedBy;
        if (changes.reviewedAt) mappedChanges.reviewed_at = changes.reviewedAt;
        if (changes.reviewNotes) mappedChanges.review_notes = changes.reviewNotes;
        if (changes.expiresAt) mappedChanges.expires_at = changes.expiresAt;

        await updateMutation({
            variables: { id, changes: mappedChanges }
        });
    };

    const deleteRequest = async (id: string) => {
        await deleteMutation({
            variables: { id }
        });
    };

    return {
        data: requests,
        loading,
        error,
        addRequest,
        updateRequest,
        deleteRequest
    };
}
