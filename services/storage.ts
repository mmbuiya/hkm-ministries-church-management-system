import { Member } from '../components/memberData';
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
  sanitizeInput,
} from './security';
import { Transaction } from '../components/financeData';
import { AttendanceRecord } from '../components/attendanceData';
import { Equipment } from '../components/equipmentData';
import { MaintenanceRecord } from '../components/maintenanceData';
import { SmsRecord } from '../components/smsData';
import { Visitor } from '../components/visitorData';
import { Group } from '../components/GroupsManagementPage';
import { Branch, initialBranches } from '../components/branchData';

// Types for Settings
export interface ChurchInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface SmsConfig {
  apiKey: string; // Africa's Talking API Key
  atUsername?: string; // Africa's Talking Username (e.g. 'hkmministries' or 'sandbox')
  senderId: string; // Custom Sender Name (e.g. 'HKM MIN')
  textbeeApiKey?: string;
  textbeeDeviceId?: string;
  welcomeMessage: string;
  birthdayMessage: string;
}

export interface EmailConfig {
  resendApiKey: string;
  resendFromEmail: string;
  portalUrl: string;
}

export interface ImprovMXConfig {
  apiKey: string;
  domain: string;
}

export interface AppSettings {
  churchInfo: ChurchInfo;
  smsConfig: SmsConfig;
  emailConfig: EmailConfig;
  improvmxConfig: ImprovMXConfig;
  aiApiKey: string;
  biometrics: Record<string, boolean>;
}

const initialSettings: AppSettings = {
  churchInfo: {
    name: '',
    address: '',
    phone: '',
    email: '',
  },
  smsConfig: {
    apiKey: '',
    atUsername: 'sandbox',
    senderId: 'HKM MIN',
    textbeeApiKey: '',
    textbeeDeviceId: '',
    welcomeMessage: 'Hi {name}, welcome to HKM MINISTRIES! We are so glad you joined us.',
    birthdayMessage: 'Happy Birthday {name}! We wish you a day filled with joy.',
  },
  emailConfig: {
    resendApiKey: '',
    resendFromEmail: 'noreply@hkmministries.org',
    portalUrl: 'https://hkmministries.org/login',
  },
  improvmxConfig: {
    apiKey: '',
    domain: 'hkmministries.org',
  },
  aiApiKey: '',
  biometrics: {},
};

// Generic LocalStorage Helper with CRUD
class LocalStore<T extends { id: string | number }> {
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
    return this.getStored();
  }

  async saveAll(items: T[]): Promise<void> {
    this.setStored(items);
  }

  async add(item: T): Promise<void> {
    const items = this.getStored();
    items.push(item);
    this.setStored(items);
  }

  async update(id: string | number, data: Partial<T>): Promise<void> {
    const items = this.getStored();
    const index = items.findIndex((i) => i.id == id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data };
      this.setStored(items);
    }
  }

  async save(item: T): Promise<void> {
    const items = this.getStored();
    const index = items.findIndex((i) => i.id == item.id);
    if (index !== -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    this.setStored(items);
  }

  async delete(id: string | number): Promise<void> {
    const items = this.getStored();
    const newItems = items.filter((i) => i.id != id);
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
  return [];
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
        localStorage.setItem(this.key, JSON.stringify(this.initialData));
        return { ...this.initialData };
      }
      const parsed = JSON.parse(item);
      // Merge with defaults so missing nested objects never cause runtime errors
      return {
        ...this.initialData,
        ...parsed,
        churchInfo: { ...this.initialData.churchInfo, ...parsed.churchInfo },
        smsConfig: { ...this.initialData.smsConfig, ...parsed.smsConfig },
        emailConfig: { ...this.initialData.emailConfig, ...parsed.emailConfig },
        improvmxConfig: { ...this.initialData.improvmxConfig, ...parsed.improvmxConfig },
      };
    } catch {
      return { ...this.initialData };
    }
  }

  async getAll(): Promise<AppSettings> {
    return this.getStored();
  }

  async save(settings: AppSettings): Promise<void> {
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
const membersStore = new LocalStore<Member>('hkm_members', []);
const groupsStore = new LocalStore<Group>('hkm_groups', getInitialGroups());
const attendanceStore = new LocalStore<AttendanceRecord>('hkm_attendance_records', []);
const transactionsStore = new LocalStore<Transaction>('hkm_transactions', []);
const equipmentStore = new LocalStore<Equipment>('hkm_equipment', []);
const maintenanceStore = new LocalStore<MaintenanceRecord>('hkm_maintenance', []);
const smsStore = new LocalStore<SmsRecord>('hkm_sms_records', []);
const visitorsStore = new LocalStore<Visitor>('hkm_visitors', []);
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
    const usersWithoutPasswords = usersStore.getRaw().map(({ ...user }) => user);

    // Strip API keys from settings before export
    const settingsRaw = settingsStore.getRaw();
    const settingsWithoutSecrets = {
      ...settingsRaw,
      smsConfig: { ...settingsRaw.smsConfig, apiKey: '' },
      emailConfig: { ...settingsRaw.emailConfig, resendApiKey: '' },
      improvmxConfig: { ...settingsRaw.improvmxConfig, apiKey: '' },
      aiApiKey: '',
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
  importBackup: async (data: Record<string, unknown>) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');

    if (data.users) usersStore.restore(data.users as User[]);
    if (data.members) membersStore.restore(data.members as Member[]);
    if (data.groups) groupsStore.restore(data.groups as Group[]);
    if (data.attendance) attendanceStore.restore(data.attendance as AttendanceRecord[]);
    if (data.transactions) transactionsStore.restore(data.transactions as Transaction[]);
    if (data.equipment) equipmentStore.restore(data.equipment as Equipment[]);
    if (data.maintenance) maintenanceStore.restore(data.maintenance as MaintenanceRecord[]);
    if (data.sms) smsStore.restore(data.sms as SmsRecord[]);
    if (data.visitors) visitorsStore.restore(data.visitors as Visitor[]);
    if (data.appSettings) settingsStore.restore(data.appSettings as AppSettings);

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
  },
};

// Database Service Interface — DEPRECATED: local auth is no longer the primary path.
// All admin authentication now goes through Clerk.
// This remains for legacy first-run / offline scenarios only.
// TODO: Remove when Clerk is the exclusive auth path.
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
          message: `Too many failed attempts. Please try again in ${remainingMins} minutes.`,
        };
      }

      const users = await usersStore.getAll();
      const user = users.find((u) => u.email.toLowerCase() === sanitizedEmail);

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
      const existing = users.find((u) => u.email.toLowerCase() === sanitizedEmail);

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
        passwordHash: passwordHash,
      };

      await usersStore.add(newUser);
      createSession(newUser.id, newUser.email, newUser.role);
      logAuditEvent(
        AuditActions.REGISTER,
        'auth',
        newUser.id,
        `New user registered: ${sanitizedEmail} (${newUser.role})`,
      );

      return newUser;
    },

    logout: async () => {
      logAuditEvent(AuditActions.LOGOUT, 'auth');
      clearSession();
    },

    sendVerification: async () => {
      // No-op for local auth
    },

    resetPassword: async (email: string) => {
      logAuditEvent(AuditActions.PASSWORD_RESET, 'auth', undefined, `Password reset requested: ${email}`);
    },
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
        filtered = existing.filter((r) => !(r.date === serviceDate && r.service === serviceName));
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
  },
};
