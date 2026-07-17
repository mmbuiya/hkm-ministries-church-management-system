export interface MemberUser {
  id: string;
  email: string;
  membership_number: string;
  full_name: string;
  phone_number?: string;
  department?: string;
  status?: string;
  token?: string; // Supabase custom JWT for authenticated portal queries
  expiresAt?: number;
}

export interface GivingRecord {
  id: string;
  member: string;
  date: string;
  type: string;
  amount_kes: number;
  method: string;
}
