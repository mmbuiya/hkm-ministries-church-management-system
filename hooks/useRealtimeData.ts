import { useState, useEffect } from 'react';
import { fbService } from '../services/firebaseService';
import { Member } from '../components/memberData';
import { Transaction } from '../components/financeData';
import { AttendanceRecord } from '../components/attendanceData';
import { Equipment } from '../components/equipmentData';
import { MaintenanceRecord } from '../components/maintenanceData';
import { Visitor } from '../components/visitorData';
import { Group } from '../components/GroupsManagementPage';
import { User, RecycleBinItem } from '../components/userData';
import { SmsRecord } from '../components/smsData';
import { Branch } from '../components/branchData';
import { PermissionRequest } from '../components/PermissionRequest';
import { UserSession, LoginAttempt } from '../components/userSessionData';

// Generic hook for real-time data subscriptions
export function useRealtimeMembers(initialData: Member[] = []) {
  const [data, setData] = useState<Member[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.members.subscribe((members) => {
      setData(members);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeTransactions(initialData: Transaction[] = []) {
  const [data, setData] = useState<Transaction[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.finance.subscribe((transactions) => {
      setData(transactions);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeAttendance(initialData: AttendanceRecord[] = []) {
  const [data, setData] = useState<AttendanceRecord[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.attendance.subscribe((records) => {
      setData(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeGroups(initialData: Group[] = []) {
  const [data, setData] = useState<Group[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.groups.subscribe((groups) => {
      setData(groups);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeEquipment(initialData: Equipment[] = []) {
  const [data, setData] = useState<Equipment[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.equipment.subscribe((equipment) => {
      setData(equipment);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeMaintenance(initialData: MaintenanceRecord[] = []) {
  const [data, setData] = useState<MaintenanceRecord[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.maintenance.subscribe((records) => {
      setData(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeVisitors(initialData: Visitor[] = []) {
  const [data, setData] = useState<Visitor[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.visitors.subscribe((visitors) => {
      setData(visitors);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeSms(initialData: SmsRecord[] = []) {
  const [data, setData] = useState<SmsRecord[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.sms.subscribe((records) => {
      setData(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeUsers(initialData: User[] = []) {
  const [data, setData] = useState<User[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.users.subscribe((users) => {
      setData(users);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeBranches(initialData: Branch[] = []) {
  const [data, setData] = useState<Branch[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.branches.subscribe((branches) => {
      setData(branches);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeRecycleBin(initialData: RecycleBinItem[] = []) {
  const [data, setData] = useState<RecycleBinItem[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.recycleBin.subscribe((items) => {
      setData(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimePermissionRequests(initialData: PermissionRequest[] = []) {
  const [data, setData] = useState<PermissionRequest[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.permissionRequests.subscribe((requests) => {
      setData(requests);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeUserSessions(initialData: UserSession[] = []) {
  const [data, setData] = useState<UserSession[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.userSessions.subscribe((sessions) => {
      setData(sessions);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}

export function useRealtimeLoginAttempts(initialData: LoginAttempt[] = []) {
  const [data, setData] = useState<LoginAttempt[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fbService.loginAttempts.subscribe((attempts) => {
      setData(attempts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { data, loading, error, setData };
}
