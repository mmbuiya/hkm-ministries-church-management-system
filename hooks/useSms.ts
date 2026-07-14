
import { useState, useMemo } from 'react';
import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { SmsRecord } from '../components/smsData';
import {
    GET_SMS_QUERY,
    GET_SMS_SUBSCRIPTION,
    ADD_SMS_MUTATION,
    DELETE_SMS_MUTATION
} from '../services/graphql/sms';

export function useSms() {
    const [monthsBack, setMonthsBack] = useState(3);
    
    const startDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - monthsBack);
        return d.toISOString().split('T')[0];
    }, [monthsBack]);

    const { data: queryData, loading: queryLoading } = useQuery(GET_SMS_QUERY, {
        variables: { startDate },
        fetchPolicy: 'cache-first'
    });
    
    const { data: subData, loading: subLoading, error } = useSubscription(GET_SMS_SUBSCRIPTION, {
        variables: { startDate }
    });

    const [addSmsMutation] = useMutation(ADD_SMS_MUTATION);
    const [deleteSmsMutation] = useMutation(DELETE_SMS_MUTATION);

    const smsRecords: SmsRecord[] = useMemo(() => {
        const rawData = subData?.sms_records || queryData?.sms_records;
        if (!rawData) return [];
        return rawData.map((s: any) => ({
            id: s.id,
            recipientCount: s.recipient_count,
            message: s.message,
            status: s.status as 'Sent' | 'Pending' | 'Failed',
            date: s.date
        }));
    }, [subData, queryData]);

    const loadMore = () => {
        setMonthsBack(prev => prev + 3);
    };

    const addSmsRecord = async (record: Omit<SmsRecord, 'id'>) => {
        await addSmsMutation({
            variables: {
                object: {
                    recipient_count: record.recipientCount,
                    message: record.message,
                    status: record.status,
                    date: record.date
                }
            }
        });
    };

    const deleteSmsRecord = async (id: number) => {
        await deleteSmsMutation({
            variables: { id }
        });
    };

    return {
        data: smsRecords,
        loading: queryLoading && !queryData,
        error,
        addSmsRecord,
        deleteSmsRecord,
        loadMore,
        monthsBack,
        setData: () => { } // Compatibility
    };
}
