
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Member } from '../components/memberData';
import {
    GET_MEMBERS_QUERY,
    ADD_MEMBER_MUTATION,
    UPDATE_MEMBER_MUTATION,
    DELETE_MEMBER_MUTATION
} from '../services/graphql/members';

interface HasuraMember {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
    email?: string;
    phone?: string;
    department?: string;
    status: 'Active' | 'Inactive' | 'Transferred';
    dob?: string;
    gender: 'Male' | 'Female';
    avatar_transform?: string;
    address?: string;
    joined_at?: string;
    occupation?: string;
    marital_status?: string;
}

// Transform Hasura data to frontend Member format
function transformMember(hasuraMember: HasuraMember): Member {
    const fullName = `${hasuraMember.first_name || ''} ${hasuraMember.last_name || ''}`.trim();
    return {
        id: hasuraMember.id,
        name: fullName,
        title: hasuraMember.title || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}`,
        avatarTransform: hasuraMember.avatar_transform ? JSON.parse(hasuraMember.avatar_transform) : undefined,
        phone: hasuraMember.phone || '',
        email: hasuraMember.email || '',
        department: hasuraMember.department || '',
        role: 'Member', // Default role since it's not in the database
        status: hasuraMember.status,
        dateAdded: hasuraMember.joined_at || new Date().toISOString().split('T')[0],
        dob: hasuraMember.dob || '',
        gender: hasuraMember.gender,
        occupation: hasuraMember.occupation,
        maritalStatus: hasuraMember.marital_status,
        location: hasuraMember.address
    };
}

export function useMembers() {
    const { data, loading, error, refetch } = useQuery(GET_MEMBERS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addMemberMutation] = useMutation(ADD_MEMBER_MUTATION);
    const [updateMemberMutation] = useMutation(UPDATE_MEMBER_MUTATION);
    const [deleteMemberMutation] = useMutation(DELETE_MEMBER_MUTATION);

    const members: Member[] = useMemo(() => {
        if (!data?.members) return [];
        return data.members.map(transformMember);
    }, [data]);

    const addMember = async (member: Partial<Member>) => {
        try {
            const [firstName, ...lastNameParts] = (member.name || '').split(' ');
            const lastName = lastNameParts.join(' ');

            const memberData = {
                id: member.id || `HKM-${Date.now()}`,
                first_name: firstName || '',
                last_name: lastName || '',
                title: member.title || '',
                email: member.email || '',
                phone: member.phone || '',
                department: member.department || '',
                status: member.status || 'Active',
                dob: member.dob || null,
                gender: member.gender || 'Male',
                avatar_transform: member.avatarTransform ? JSON.stringify(member.avatarTransform) : null,
                address: member.location || '',
                occupation: member.occupation || '',
                marital_status: member.maritalStatus || '',
                joined_at: member.dateAdded || new Date().toISOString().split('T')[0]
            };

            const result = await addMemberMutation({
                variables: {
                    object: memberData
                }
            });
            
            // Refetch data to update UI immediately
            await refetch();
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    };

    const updateMember = async (id: string, updates: Partial<Member>) => {
        const hasuraUpdates: any = {};

        if (updates.name) {
            const [firstName, ...lastNameParts] = updates.name.split(' ');
            hasuraUpdates.first_name = firstName;
            hasuraUpdates.last_name = lastNameParts.join(' ');
        }

        if (updates.title !== undefined) hasuraUpdates.title = updates.title;
        if (updates.email !== undefined) hasuraUpdates.email = updates.email;
        if (updates.phone !== undefined) hasuraUpdates.phone = updates.phone;
        if (updates.department !== undefined) hasuraUpdates.department = updates.department;
        if (updates.status !== undefined) hasuraUpdates.status = updates.status;
        if (updates.dob !== undefined) hasuraUpdates.dob = updates.dob;
        if (updates.gender !== undefined) hasuraUpdates.gender = updates.gender;
        if (updates.avatarTransform !== undefined) hasuraUpdates.avatar_transform = JSON.stringify(updates.avatarTransform);
        if (updates.location !== undefined) hasuraUpdates.address = updates.location;
        if (updates.occupation !== undefined) hasuraUpdates.occupation = updates.occupation;
        if (updates.maritalStatus !== undefined) hasuraUpdates.marital_status = updates.maritalStatus;

        await updateMemberMutation({
            variables: {
                id,
                updates: hasuraUpdates
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteMember = async (id: string) => {
        await deleteMemberMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        data: members,
        setData: (newMembers: Member[]) => {
            console.warn('setData called on Hasura subscription - data is managed by GraphQL');
        },
        loading,
        error,
        addMember,
        updateMember,
        deleteMember
    };
}
