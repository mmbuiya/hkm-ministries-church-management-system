
import { Member, initialMembers } from '../components/memberData';
import { User, initialUsers } from '../components/userData';
import {
    hashPassword,
    verifyPassword,
    createSession,
    clearSession,
    checkRateLimit,
    recordLoginAttempt,
    getRemainingLockoutTime,
    logAuditEvent,
    AuditActions,
    sanitizeInput
} from './security';
import { Transaction, initialTransactions } from '../components/financeData';
import { AttendanceRecord, attendanceData } from '../components/attendanceData';
import { Equipment, initialEquipment } from '../components/equipmentData';
import { MaintenanceRecord, initialMaintenanceData } from '../components/maintenanceData';
import { SmsRecord, initialSmsData } from '../components/smsData';
import { Visitor, initialVisitors } from '../components/visitorData';
import { Group } from '../components/GroupsManagementPage';
import { Branch, initialBranches } from '../components/branchData';

// Helper for simulated async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Types for Settings
export interface ChurchInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
}

export interface SmsConfig {
    apiKey: string;
    senderId: string;
    welcomeMessage: string;
    birthdayMessage: string;
}

export interface AppSettings {
    churchInfo: ChurchInfo;
    smsConfig: SmsConfig;
    aiApiKey: string;
    biometrics: Record<string, boolean>;
}

const initialSettings: AppSettings = {
    churchInfo: {
        name: 'ICGC Emmanuel Temple',
        address: '123 Church Street, Accra, Ghana',
        phone: '+233 123 456 789',
        email: 'info@icgcemmanueltemple.org',
    },
    smsConfig: {
        apiKey: '',
        senderId: 'HKM MIN',
        welcomeMessage: 'Hi {name}, welcome to HKM MINISTRIES! We are so glad you joined us.',
        birthdayMessage: 'Happy Birthday {name}! We wish you a day filled with joy.',
    },
    aiApiKey: '',
    biometrics: {}
};

// Generic LocalStorage Helper with CRUD
class LocalStore<T extends { id: any }> {
    private key: string;
    private initialData: T[];

    constructor(key: string, initialData: T[]) {
        this.key = key;
        this.initialData = initialData;
    }

    private getStored(): T[] {
        try {
            const item = localStorage.getItem(this.key);
            if (item === null) {
                // First time - initialize with initial data and persist it
                this.setStored(this.initialData);
                return [...this.initialData];
            }
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error reading ${this.key}`, e);
            return [...this.initialData];
        }
    }

    private setStored(data: T[]): void {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error writing ${this.key}`, e);
        }
    }

    async getAll(): Promise<T[]> {
        await delay(50);
        return this.getStored();
    }

    // Overwrite all items (used for restoring backup or reordering)
    async saveAll(items: T[]): Promise<void> {
        await delay(50);
        this.setStored(items);
    }

    async add(item: T): Promise<void> {
        await delay(50);
        const items = this.getStored();
        items.push(item);
        this.setStored(items);
    }

    async update(id: any, data: Partial<T>): Promise<void> {
        await delay(50);
        const items = this.getStored();
        // Use loose equality to match string IDs with number IDs if necessary
        const index = items.findIndex(i => i.id == id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data };
            this.setStored(items);
        }
    }

    // Generic save that handles both add (if id not present or new) and update
    // Note: For this app's pattern, explicit add/update is often used, but this is a helper.
    async save(item: T): Promise<void> {
        await delay(50);
        const items = this.getStored();
        const index = items.findIndex(i => i.id == item.id);
        if (index !== -1) {
            items[index] = item;
        } else {
            items.push(item);
        }
        this.setStored(items);
    }

    async delete(id: any): Promise<void> {
        await delay(50);
        const items = this.getStored();
        const newItems = items.filter(i => i.id != id);
        this.setStored(newItems);
    }

    getRaw(): T[] {
        return this.getStored();
    }

    restore(data: T[]) {
        this.setStored(data);
    }
}

// Initial Groups Logic
const getInitialGroups = (): Group[] => {
    const departments = ["Head Pastor", "Choir", "Media", "Ushering", "Children", "New Breed", "Protocol", "Welfare", "Intercessors", "Junior Youth", "Youth", "Traffic", "Administration", "Instrumentalist", "Deacon", "Pastor's Wife"];
    return departments.map((dept, index) => ({
        id: index + 1,
        name: dept,
        leader: 'unassigned@hkm.org',
        members: 0,
        created: '2023-01-10',
    }));
};

// Simple Store for Settings (not an array)
class SettingsStore {
    private key: string;
    private initialData: AppSettings;

    constructor(key: string, initialData: AppSettings) {
        this.key = key;
        this.initialData = initialData;
    }

    private getStored(): AppSettings {
        try {
            const item = localStorage.getItem(this.key);
            if (item === null) {
                // First time - initialize and persist
                localStorage.setItem(this.key, JSON.stringify(this.initialData));
                return { ...this.initialData };
            }
            return JSON.parse(item);
        } catch {
            return { ...this.initialData };
        }
    }

    async getAll(): Promise<AppSettings> {
        await delay(50);
        return this.getStored();
    }

    async save(settings: AppSettings): Promise<void> {
        await delay(50);
        try {
            localStorage.setItem(this.key, JSON.stringify(settings));
        } catch (e) {
            console.error(`Error saving settings`, e);
        }
    }

    getRaw(): AppSettings {
        return this.getStored();
    }

    restore(data: AppSettings) {
        localStorage.setItem(this.key, JSON.stringify(data));
    }
}

// Create Instances
const usersStore = new LocalStore<User>('hkm_users', initialUsers);
const membersStore = new LocalStore<Member>('hkm_members', initialMembers);
const groupsStore = new LocalStore<Group>('hkm_groups', getInitialGroups());
const attendanceStore = new LocalStore<AttendanceRecord>('hkm_attendance_records', attendanceData);
const transactionsStore = new LocalStore<Transaction>('hkm_transactions', initialTransactions);
const equipmentStore = new LocalStore<Equipment>('hkm_equipment', initialEquipment);
const maintenanceStore = new LocalStore<MaintenanceRecord>('hkm_maintenance', initialMaintenanceData);
const smsStore = new LocalStore<SmsRecord>('hkm_sms_records', initialSmsData);
const visitorsStore = new LocalStore<Visitor>('hkm_visitors', initialVisitors);
const branchesStore = new LocalStore<Branch>('hkm_branches', initialBranches);
const settingsStore = new SettingsStore('hkm_app_settings', initialSettings);

// Export instances for direct access if needed
export const storage = {
    users: usersStore,
    members: membersStore,
    groups: groupsStore,
    attendance: attendanceStore,
    transactions: transactionsStore,
    equipment: equipmentStore,
    maintenance: maintenanceStore,
    sms: smsStore,
    visitors: visitorsStore,
    appSettings: settingsStore,

    // Centralized Backup - EXCLUDES sensitive data (passwords, API keys)
    exportBackup: async () => {
        // Strip passwordHash from users before export
        const usersWithoutPasswords = usersStore.getRaw().map(({ passwordHash, ...user }) => user);

        // Strip API keys from settings before export
        const settingsRaw = settingsStore.getRaw();
        const settingsWithoutSecrets = {
            ...settingsRaw,
            smsConfig: { ...settingsRaw.smsConfig, apiKey: '' },
            aiApiKey: ''
        };

        logAuditEvent(AuditActions.DATA_EXPORTED, 'backup');

        return {
            timestamp: new Date().toISOString(),
            users: usersWithoutPasswords,
            members: membersStore.getRaw(),
            groups: groupsStore.getRaw(),
            attendance: attendanceStore.getRaw(),
            transactions: transactionsStore.getRaw(),
            equipment: equipmentStore.getRaw(),
            maintenance: maintenanceStore.getRaw(),
            sms: smsStore.getRaw(),
            visitors: visitorsStore.getRaw(),
            appSettings: settingsWithoutSecrets,
        };
    },

    // Centralized Restore
    importBackup: async (data: any) => {
        if (!data || typeof data !== 'object') throw new Error("Invalid backup file");

        if (data.users) usersStore.restore(data.users);
        if (data.members) membersStore.restore(data.members);
        if (data.groups) groupsStore.restore(data.groups);
        if (data.attendance) attendanceStore.restore(data.attendance);
        if (data.transactions) transactionsStore.restore(data.transactions);
        if (data.equipment) equipmentStore.restore(data.equipment);
        if (data.maintenance) maintenanceStore.restore(data.maintenance);
        if (data.sms) smsStore.restore(data.sms);
        if (data.visitors) visitorsStore.restore(data.visitors);
        if (data.appSettings) settingsStore.restore(data.appSettings);

        return true;
    },

    // Dangerous Reset
    clearAll: async () => {
        localStorage.clear();
        window.location.reload();
    },

    // Helper to get API Key safely
    getApiKey: async (): Promise<string> => {
        const settings = await settingsStore.getAll();
        return settings.aiApiKey || import.meta.env.VITE_AI_API_KEY || '';
    }
};

// Database Service Interface (Replaces fbService)
export const dbService = {
    auth: {
        login: async (email: string, pass: string) => {
            const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

            // Check rate limiting
            const rateLimit = checkRateLimit(sanitizedEmail);
            if (!rateLimit.allowed) {
                const remainingMs = getRemainingLockoutTime(sanitizedEmail);
                const remainingMins = Math.ceil(remainingMs / 60000);
                logAuditEvent(AuditActions.LOGIN_FAILED, 'auth', undefined, `Rate limited: ${sanitizedEmail}`);
                throw {
                    code: 'auth/too-many-requests',
                    message: `Too many failed attempts. Please try again in ${remainingMins} minutes.`
                };
            }

            const users = await usersStore.getAll();
            const user = users.find(u => u.email.toLowerCase() === sanitizedEmail);

            if (!user) {
                recordLoginAttempt(sanitizedEmail, false);
                logAuditEvent(AuditActions.LOGIN_FAILED, 'auth', undefined, `User not found: ${sanitizedEmail}`);
                throw { code: 'auth/user-not-found', message: 'User not found' };
            }

            // Verify hashed password
            if (user.passwordHash) {
                const isValid = await verifyPassword(pass, user.passwordHash);
                if (!isValid) {
                    recordLoginAttempt(sanitizedEmail, false);
                    logAuditEvent(AuditActions.LOGIN_FAILED, 'auth', user.id, `Invalid password for: ${sanitizedEmail}`);
                    throw { code: 'auth/wrong-password', message: 'Invalid password' };
                }
            } else {
                // No password set - reject login
                recordLoginAttempt(sanitizedEmail, false);
                throw { code: 'auth/wrong-password', message: 'Invalid password' };
            }

            // Success - clear rate limit and create session
            recordLoginAttempt(sanitizedEmail, true);
            createSession(user.id, user.email, user.role);
            logAuditEvent(AuditActions.LOGIN_SUCCESS, 'auth', user.id, `Login successful: ${sanitizedEmail}`);

            // Update last login
            await usersStore.update(user.id, { lastLogin: new Date().toLocaleDateString() });
            return user;
        },

        register: async (email: string, pass: string, avatar?: string) => {
            const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
            const users = await usersStore.getAll();
            const existing = users.find(u => u.email.toLowerCase() === sanitizedEmail);

            if (existing) {
                throw { code: 'auth/email-already-in-use', message: 'Email already in use' };
            }

            // Hash the password before storing
            const passwordHash = await hashPassword(pass);

            // First user becomes Super Admin, others are Data Personnel
            const isFirstUser = users.length === 0;

            const newUser: User = {
                id: Date.now().toString(),
                username: sanitizeInput(email.split('@')[0]),
                email: sanitizedEmail,
                role: isFirstUser ? 'Super Admin' : 'Data Personnel',
                avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}`,
                lastLogin: new Date().toLocaleDateString(),
                passwordHash: passwordHash
            };

            await usersStore.add(newUser);
            createSession(newUser.id, newUser.email, newUser.role);
            logAuditEvent(AuditActions.REGISTER, 'auth', newUser.id, `New user registered: ${sanitizedEmail} (${newUser.role})`);

            return newUser;
        },

        logout: async () => {
            logAuditEvent(AuditActions.LOGOUT, 'auth');
            clearSession();
        },

        sendVerification: async (user: any) => {
            // No-op for local auth
        },

        resetPassword: async (email: string) => {
            // Simulated - in production, send email with reset link
            logAuditEvent(AuditActions.PASSWORD_RESET, 'auth', undefined, `Password reset requested: ${email}`);
            await delay(500);
        }
    },

    members: {
        getAll: () => membersStore.getAll(),
        add: (m: Member) => membersStore.add(m),
        update: (id: string, data: Partial<Member>) => membersStore.update(id, data),
        delete: (id: string) => membersStore.delete(id),
    },

    finance: {
        getAll: () => transactionsStore.getAll(),
        add: (t: Transaction) => transactionsStore.add(t),
        update: (t: Transaction) => transactionsStore.update(t.id, t),
        delete: (id: number) => transactionsStore.delete(id),
    },

    attendance: {
        getAll: () => attendanceStore.getAll(),
        batchSave: async (records: AttendanceRecord[], serviceDate?: string, serviceName?: string) => {
            const existing = await attendanceStore.getAll();
            // If date and service provided, filter out old records for that date/service first
            let filtered = existing;
            if (serviceDate && serviceName) {
                filtered = existing.filter(r => !(r.date === serviceDate && r.service === serviceName));
            }
            const updated = [...filtered, ...records];
            await attendanceStore.saveAll(updated);
        },
        delete: (id: number) => attendanceStore.delete(id),
    },

    groups: {
        getAll: () => groupsStore.getAll(),
        save: (g: Group) => groupsStore.save(g), // Handles add/update by ID
        delete: (id: number) => groupsStore.delete(id),
    },

    equipment: {
        getAll: () => equipmentStore.getAll(),
        save: (e: Equipment) => equipmentStore.save(e),
        delete: (id: number) => equipmentStore.delete(id),
    },

    maintenance: {
        getAll: () => maintenanceStore.getAll(),
        save: (r: MaintenanceRecord) => maintenanceStore.save(r),
        delete: (id: number) => maintenanceStore.delete(id),
    },

    visitors: {
        getAll: () => visitorsStore.getAll(),
        save: (v: Visitor) => visitorsStore.save(v),
        delete: (id: number) => visitorsStore.delete(id),
    },

    sms: {
        getAll: () => smsStore.getAll(),
        save: (r: SmsRecord) => smsStore.add(r),
    },

    users: {
        getAll: () => usersStore.getAll(),
        save: (u: User) => usersStore.save(u),
        delete: (id: string) => usersStore.delete(id),
    },

    branches: {
        getAll: () => branchesStore.getAll(),
        save: (b: Branch) => branchesStore.save(b),
        delete: (id: string) => branchesStore.delete(id),
    }
};
