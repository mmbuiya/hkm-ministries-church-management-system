
import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Visitor, FollowUp, VisitorStatus } from '../components/visitorData';
import {
    GET_VISITORS_QUERY,
    ADD_VISITOR_MUTATION,
    UPDATE_VISITOR_MUTATION,
    DELETE_VISITOR_MUTATION,
    ADD_FOLLOW_UP_MUTATION,
    UPDATE_FOLLOW_UP_MUTATION,
    DELETE_FOLLOW_UP_MUTATION
} from '../services/graphql/visitors';

export function useVisitors() {
    const { data, loading, error, refetch } = useQuery(GET_VISITORS_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addVisitorMutation] = useMutation(ADD_VISITOR_MUTATION);
    const [updateVisitorMutation] = useMutation(UPDATE_VISITOR_MUTATION);
    const [deleteVisitorMutation] = useMutation(DELETE_VISITOR_MUTATION);
    const [addFollowUpMutation] = useMutation(ADD_FOLLOW_UP_MUTATION);
    const [updateFollowUpMutation] = useMutation(UPDATE_FOLLOW_UP_MUTATION);
    const [deleteFollowUpMutation] = useMutation(DELETE_FOLLOW_UP_MUTATION);

    const visitors: Visitor[] = useMemo(() => {
        if (!data?.visitors) return [];
        return data.visitors.map((v: any) => ({
            id: v.id,
            name: v.name,
            initials: v.initials || '',
            phone: v.phone,
            email: v.email || undefined,
            heardFrom: v.heard_from || '',
            firstVisit: v.first_visit || '',
            registeredDate: v.registered_date || '',
            status: v.status as VisitorStatus,
            followUps: v.follow_ups?.map((f: any) => ({
                id: f.id,
                visitorId: f.visitor_id,
                date: f.date,
                interactionType: f.interaction_type,
                notes: f.notes || '',
                nextFollowUpDate: f.next_follow_up_date || undefined,
                outcome: f.outcome || ''
            })) || []
        }));
    }, [data]);

    const addVisitor = async (visitor: Partial<Visitor>) => {
        const { id, followUps, initials, registeredDate, ...rest } = visitor;
        await addVisitorMutation({
            variables: {
                object: {
                    ...rest,
                    name: rest.name || '',
                    phone: rest.phone || '',
                    initials: initials || (rest.name ? rest.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''),
                    heard_from: rest.heardFrom,
                    first_visit: rest.firstVisit,
                    registered_date: registeredDate || new Date().toISOString().split('T')[0],
                    status: rest.status || 'New'
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateVisitor = async (id: number, updates: Partial<Visitor>) => {
        const { id: _, followUps, ...rest } = updates;
        const set: any = {};
        if (rest.name) set.name = rest.name;
        if (rest.phone) set.phone = rest.phone;
        if (rest.email !== undefined) set.email = rest.email;
        if (rest.heardFrom) set.heard_from = rest.heardFrom;
        if (rest.firstVisit) set.first_visit = rest.firstVisit;
        if (rest.status) set.status = rest.status;
        if (rest.initials) set.initials = rest.initials;

        await updateVisitorMutation({
            variables: { id, _set: set }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteVisitor = async (id: number) => {
        await deleteVisitorMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const addFollowUp = async (followUp: Omit<FollowUp, 'id'>) => {
        await addFollowUpMutation({
            variables: {
                object: {
                    visitor_id: followUp.visitorId,
                    date: followUp.date,
                    interaction_type: followUp.interactionType,
                    notes: followUp.notes,
                    next_follow_up_date: followUp.nextFollowUpDate,
                    outcome: followUp.outcome
                }
            }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const updateFollowUp = async (id: number, updates: Partial<FollowUp>) => {
        const set: any = {};
        if (updates.date) set.date = updates.date;
        if (updates.interactionType) set.interaction_type = updates.interactionType;
        if (updates.notes) set.notes = updates.notes;
        if (updates.nextFollowUpDate) set.next_follow_up_date = updates.nextFollowUpDate;
        if (updates.outcome) set.outcome = updates.outcome;

        await updateFollowUpMutation({
            variables: { id, _set: set }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    const deleteFollowUp = async (id: number) => {
        await deleteFollowUpMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        data: visitors,
        loading,
        error,
        addVisitor,
        updateVisitor,
        deleteVisitor,
        addFollowUp,
        updateFollowUp,
        deleteFollowUp,
        setData: () => { } // Compatibility with old hooks if needed
    };
}
