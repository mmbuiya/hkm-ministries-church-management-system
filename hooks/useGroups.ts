
import { useMemo } from 'react';
import { useSubscription, useMutation } from '@apollo/client';
import { Group } from '../components/GroupsManagementPage';
import {
    GET_GROUPS_SUBSCRIPTION,
    ADD_GROUP_MUTATION,
    UPDATE_GROUP_MUTATION,
    DELETE_GROUP_MUTATION
} from '../services/graphql/groups';
import { Member } from '../components/memberData';

export function useGroups(members: Member[] = []) {
    const { data, loading, error } = useSubscription(GET_GROUPS_SUBSCRIPTION);
    const [addGroupMutation] = useMutation(ADD_GROUP_MUTATION);
    const [updateGroupMutation] = useMutation(UPDATE_GROUP_MUTATION);
    const [deleteGroupMutation] = useMutation(DELETE_GROUP_MUTATION);

    const groups: Group[] = useMemo(() => {
        if (!data?.groups) return [];
        return data.groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            leader: g.leader?.email || g.leader_id || '', // Maintain email-based leader for UI compatibility
            members: g.member_count || 0,
            created: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : ''
        }));
    }, [data]);

    const addGroup = async (groupData: Partial<Group>) => {
        // Find member ID by email (UI uses email for leader)
        const leaderMember = members.find(m => m.email === groupData.leader);

        await addGroupMutation({
            variables: {
                object: {
                    name: groupData.name || '',
                    leader_id: leaderMember?.id || null,
                    member_count: groupData.members || 0
                }
            }
        });
    };

    const updateGroup = async (id: number, updates: Partial<Group>) => {
        const set: any = {};
        if (updates.name) set.name = updates.name;
        if (updates.leader) {
            const leaderMember = members.find(m => m.email === updates.leader);
            set.leader_id = leaderMember?.id || null;
        }
        if (updates.members !== undefined) set.member_count = updates.members;

        await updateGroupMutation({
            variables: { id, _set: set }
        });
    };

    const deleteGroup = async (id: number) => {
        await deleteGroupMutation({
            variables: { id }
        });
    };

    return {
        data: groups,
        loading,
        error,
        addGroup,
        updateGroup,
        deleteGroup,
        setData: () => { } // Compatibility
    };
}
