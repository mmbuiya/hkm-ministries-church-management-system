
import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { AttendanceRecord, AttendanceStatus } from '../components/attendanceData';
import {
    GET_ATTENDANCE_QUERY,
    ADD_ATTENDANCE_MUTATION,
    DELETE_ATTENDANCE_MUTATION,
    DELETE_ATTENDANCE_BY_SERVICE_MUTATION
} from '../services/graphql/attendance';
import { Member } from '../components/memberData';

export function useAttendance(members: Member[] = []) {
    const { data, loading, error, refetch } = useQuery(GET_ATTENDANCE_QUERY, {
        pollInterval: 5000, // Poll every 5 seconds for real-time updates
        errorPolicy: 'all'
    });
    const [addAttendanceMutation] = useMutation(ADD_ATTENDANCE_MUTATION);
    const [deleteAttendanceMutation] = useMutation(DELETE_ATTENDANCE_MUTATION);
    const [deleteByServiceMutation] = useMutation(DELETE_ATTENDANCE_BY_SERVICE_MUTATION);

    const attendanceRecords: AttendanceRecord[] = useMemo(() => {
        if (!data?.attendance_records) return [];
        return data.attendance_records.map((record: any) => ({
            id: record.id,
            date: record.date,
            service: record.service,
            memberName: `${record.member?.first_name || ''} ${record.member?.last_name || ''}`.trim() || 'Unknown Member',
            status: record.status as AttendanceStatus,
        }));
    }, [data]);

    const batchSaveAttendance = async (
        newAttendance: Record<string, AttendanceStatus>,
        serviceName: string,
        serviceDate: string
    ) => {
        try {
            // 1. First, delete existing records for this service and date (idempotency)
            await deleteByServiceMutation({
                variables: {
                    date: serviceDate,
                    service: serviceName
                }
            });

            // 2. Prepare new records
            // The key can be member.id, member.email, or a generated key from name
            const objects = Object.entries(newAttendance).map(([memberKey, status]) => {
                // Try to find member by id first, then email, then by matching name-based key
                let member = members.find(m => m.id === memberKey);
                if (!member) {
                    member = members.find(m => m.email === memberKey);
                }
                if (!member) {
                    // Try to match by name-based key (name.toLowerCase().replace(/\s+/g, '_'))
                    member = members.find(m => {
                        const nameKey = m.name.toLowerCase().replace(/\s+/g, '_');
                        return nameKey === memberKey;
                    });
                }
                if (!member) {
                    console.warn(`Member with key ${memberKey} not found during attendance save.`);
                }
                return {
                    date: serviceDate,
                    service: serviceName,
                    member_id: member?.id || 'unknown',
                    status: status
                };
            }).filter(obj => obj.member_id !== 'unknown');

            if (objects.length > 0) {
                // 3. Insert new records
                await addAttendanceMutation({
                    variables: { objects }
                });
            }
            
            // 4. Refetch data to update UI immediately
            await refetch();
        } catch (err) {
            console.error("Error saving attendance:", err);
            throw err;
        }
    };

    const deleteAttendanceRecord = async (id: number) => {
        await deleteAttendanceMutation({
            variables: { id }
        });
        
        // Refetch data to update UI immediately
        await refetch();
    };

    return {
        data: attendanceRecords,
        loading,
        error,
        batchSaveAttendance,
        deleteAttendanceRecord
    };
}
