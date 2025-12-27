
import PocketBase from 'pocketbase';

// Replace with your actual PocketBase URL (usually http://127.0.0.1:8090 for local dev)
const PB_URL = 'http://127.0.0.1:8090';

export const pb = new PocketBase(PB_URL);

// Disable auto-cancellation for smoother React queries
pb.autoCancellation(false);

// Helper to get the full image URL
export const getImageUrl = (collectionId: string, recordId: string, fileName: string) => {
    if (!fileName) return '';
    return `${PB_URL}/api/files/${collectionId}/${recordId}/${fileName}`;
};

// Types corresponding to PocketBase Collections
export interface PBMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    department: string;
    role: string;
    status: string;
    dob: string;
    created: string;
    updated: string;
}

export interface PBTransaction {
    id: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
    date: string;
    member?: string; // Relation ID
    description: string;
}
