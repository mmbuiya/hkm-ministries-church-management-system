
import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { Branch } from '../components/branchData';
import {
    GET_BRANCHES_SUBSCRIPTION,
    GET_BRANCHES_QUERY,
    ADD_BRANCH_MUTATION,
    UPDATE_BRANCH_MUTATION,
    DELETE_BRANCH_MUTATION
} from '../services/graphql/branches';

export function useBranches() {
    const { data: queryData, loading: queryLoading } = useQuery(GET_BRANCHES_QUERY, {
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
    });
    const { data: subData, loading: subLoading, error } = useSubscription(GET_BRANCHES_SUBSCRIPTION, {
        errorPolicy: 'all'
    });
    const data = subData ?? queryData;
    const loading = subData === undefined && queryLoading;
    const [addBranchMutation] = useMutation(ADD_BRANCH_MUTATION);
    const [updateBranchMutation] = useMutation(UPDATE_BRANCH_MUTATION);
    const [deleteBranchMutation] = useMutation(DELETE_BRANCH_MUTATION);

    const branches: Branch[] = useMemo(() => {
        if (!data?.branches) return [];
        return data.branches.map((b: any) => {
            // Generate realistic member counts (since we don't have real relationships yet)
            const memberCount = {
                male: Math.floor(Math.random() * 50) + 10,
                female: Math.floor(Math.random() * 60) + 15,
                total: 0
            };
            memberCount.total = memberCount.male + memberCount.female;

            // Generate some sample giving records (since we don't have real relationships yet)
            const givingRecords: any[] = [];
            const currentDate = new Date();
            for (let i = 0; i < 5; i++) {
                const date = new Date(currentDate);
                date.setMonth(date.getMonth() - i);
                givingRecords.push({
                    id: `giving-${b.id}-${i}`,
                    date: date.toISOString().split('T')[0],
                    type: ['Tithe', 'Offering', 'Special Seed', 'Building Fund'][Math.floor(Math.random() * 4)],
                    amount: Math.floor(Math.random() * 50000) + 10000,
                    description: 'Monthly contribution'
                });
            }

            return {
                id: b.id,
                name: b.name,
                location: b.location || '',
                address: b.location || '',
                phone: b.phone || '',
                email: b.email || '',
                isActive: b.is_active !== false,
                pastor: {
                    name: b.manager_id || 'Pastor ' + b.name.split(' ')[0],
                    email: b.email || `pastor@${b.name.toLowerCase().replace(/\s+/g, '')}.church`,
                    phone: b.phone || '0700000000',
                    gender: 'Male' as const,
                    maritalStatus: 'Married' as const,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(b.manager_id || 'Pastor ' + b.name.split(' ')[0])}&background=059669&color=fff`,
                    avatarTransform: undefined
                },
                memberCount,
                givingRecords,
                created: b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '',
                createdAt: b.created_at || new Date().toISOString(),
                updatedAt: b.updated_at || new Date().toISOString()
            };
        });
    }, [data]);

    const addBranch = async (branch: Branch) => {
        const id = Date.now().toString();
        await addBranchMutation({
            variables: {
                object: {
                    id,
                    name: branch.name,
                    location: branch.address,
                    manager_id: null, // Set to null to avoid foreign key constraint
                    phone: branch.phone,
                    email: branch.email,
                    is_active: branch.isActive
                }
            }
        });
        
        // Real-time subscription will update UI automatically
    };

    const updateBranch = async (id: string, branch: Partial<Branch>) => {
        await updateBranchMutation({
            variables: {
                id,
                changes: {
                    name: branch.name,
                    location: branch.address,
                    manager_id: null, // Set to null to avoid foreign key constraint
                    phone: branch.phone,
                    email: branch.email,
                    is_active: branch.isActive
                }
            }
        });
        
        // Real-time subscription will update UI automatically
    };

    const deleteBranch = async (id: string) => {
        await deleteBranchMutation({
            variables: { id }
        });
        
        // Real-time subscription will update UI automatically
    };

    return {
        data: branches,
        loading,
        error,
        addBranch,
        updateBranch,
        deleteBranch
    };
}
