
import { useMemo } from 'react';
import { useSubscription, useMutation } from '@apollo/client';
import { SmsRecord } from '../components/smsData';
import {
    GET_SMS_SUBSCRIPTION,
    ADD_SMS_MUTATION,
    DELETE_SMS_MUTATION
} from '../services/graphql/sms';

export function useSms() {
    const { data, loading, error } = useSubscription(GET_SMS_SUBSCRIPTION);
    const [addSmsMutation] = useMutation(ADD_SMS_MUTATION);
    const [deleteSmsMutation] = useMutation(DELETE_SMS_MUTATION);

    const smsRecords: SmsRecord[] = useMemo(() => {
        if (!data?.sms_records) return [];
        return data.sms_records.map((s: any) => ({
            id: s.id,
            recipientCount: s.recipient_count,
            message: s.message,
            status: s.status as 'Sent' | 'Pending' | 'Failed',
            date: s.date
        }));
    }, [data]);

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
        loading,
        error,
        addSmsRecord,
        deleteSmsRecord,
        setData: () => { } // Compatibility
    };
}
