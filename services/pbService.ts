
import { pb, PBMember, PBTransaction } from './pocketbase';
import { Member } from '../components/memberData';
import { Transaction } from '../components/financeData';

/**
 * This service mimics the functionality of storage.ts but talks to a real backend.
 * To use this, you would swap imports in your components from './storage' to './pbService'.
 */

// --- Members Service ---
export const memberService = {
    getAll: async (): Promise<Member[]> => {
        try {
            const records = await pb.collection('members').getFullList<PBMember>({
                sort: '-created',
            });
            
            // Map PB format to App format
            return records.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                role: r.role,
                department: r.department,
                status: r.status as any,
                avatar: r.avatar ? pb.files.getUrl(r, r.avatar) : '',
                dob: r.dob,
                title: '', // Add fields if your PB schema has them
                dateAdded: r.created.split(' ')[0],
                gender: 'Male' // Default or fetch from DB if added to schema
            }));
        } catch (error) {
            console.error("PB Load Error", error);
            return [];
        }
    },

    create: async (data: Partial<Member>) => {
        return await pb.collection('members').create(data);
    },

    update: async (id: string, data: Partial<Member>) => {
        return await pb.collection('members').update(id, data);
    },

    delete: async (id: string) => {
        return await pb.collection('members').delete(id);
    }
};

// --- Finance Service ---
export const financeService = {
    getAll: async (): Promise<Transaction[]> => {
        try {
            const records = await pb.collection('transactions').getFullList<PBTransaction>({
                sort: '-date',
            });
            
            return records.map(r => ({
                id: r.id as any, // App uses number IDs currently, refactor app to use string IDs for full compatibility
                amount: r.amount,
                type: r.type,
                category: r.category as any,
                date: r.date.split(' ')[0],
                description: r.description,
                memberId: r.member // This returns the ID, not the email. 
            }));
        } catch (error) {
            return [];
        }
    },

    create: async (data: Partial<Transaction>) => {
        return await pb.collection('transactions').create(data);
    }
};

// --- Authentication Wrapper ---
export const authService = {
    login: async (email: string, pass: string) => {
        try {
            const authData = await pb.collection('users').authWithPassword(email, pass);
            return authData.record;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
    logout: () => {
        pb.authStore.clear();
    },
    getCurrentUser: () => {
        return pb.authStore.model;
    }
};
