
export type IncomeCategory = 'Tithe' | 'Offering' | 'Project Offering' | 'Pledge' | 'Seed' | "Pastor's Appreciation" | 'Welfare' | 'Children Service Offering' | 'Donation' | 'Others';
export type ExpenseCategory = 'Utilities' | 'Rent' | 'Salaries' | 'Supplies' | 'Events' | 'Maintenance' | 'Outreach' | 'Honorarium' | 'Others';
export type TransactionCategory = IncomeCategory | ExpenseCategory;

export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
    id: number;
    date: string; // YYYY-MM-DD
    category: TransactionCategory;
    type: TransactionType;
    amount: number;
    description: string;
    memberId?: string; // email of the member
    nonMemberName?: string; // name of the non-member contributor
}

export const initialTransactions: Transaction[] = [
    { id: 1, date: '2025-04-28', category: 'Tithe', type: 'Income', amount: 100.00, description: '', memberId: 'awuah.victoria@example.com' },
    { id: 2, date: '2025-04-28', category: 'Offering', type: 'Income', amount: 1000.00, description: 'note', memberId: undefined },
    { id: 3, date: '2025-04-16', category: 'Tithe', type: 'Income', amount: 100.00, description: '', memberId: 'john.d@example.com' },
    { id: 4, date: '2025-04-16', category: 'Welfare', type: 'Income', amount: 10.00, description: '', memberId: 'otoo.beatrice@example.com' },
    { id: 5, date: '2025-04-16', category: 'Offering', type: 'Income', amount: 500.00, description: '', memberId: undefined },
    { id: 6, date: '2025-04-09', category: 'Utilities', type: 'Expense', amount: 500.00, description: 'Electricity bill for April', memberId: undefined },
    { id: 7, date: '2025-04-21', category: 'Tithe', type: 'Income', amount: 240.00, description: '', memberId: 'poku.solomon@example.com' },
    { id: 8, date: '2025-04-16', category: 'Welfare', type: 'Income', amount: 10.00, description: '', memberId: 'afua.t@example.com' },
    { id: 9, date: '2025-04-16', category: 'Welfare', type: 'Income', amount: 6.00, description: '', memberId: 'Kaboreaziz723@gmail.com' }, // greater grace
    { id: 10, date: '2025-03-25', category: 'Offering', type: 'Income', amount: 850.00, description: '', memberId: undefined },
    { id: 11, date: '2025-03-15', category: 'Supplies', type: 'Expense', amount: 250.00, description: 'Office supplies', memberId: undefined },
    { id: 12, date: '2025-02-20', category: 'Offering', type: 'Income', amount: 1200.00, description: '', memberId: undefined },
    { id: 13, date: '2025-04-28', category: 'Tithe', type: 'Income', amount: 145.00, description: '', memberId: 'jane.s@example.com' },
    { id: 14, date: '2025-04-20', category: 'Project Offering', type: 'Income', amount: 250.00, description: 'Building fund', memberId: undefined },
    { id: 15, date: '2025-04-02', category: 'Offering', type: 'Income', amount: 270.00, description: '', memberId: undefined },
    { id: 16, date: '2025-04-28', category: 'Rent', type: 'Expense', amount: 2000.00, description: 'Church hall rent for May', memberId: undefined },
    { id: 17, date: '2025-04-25', category: 'Pledge', type: 'Income', amount: 500.00, description: 'Building fund pledge', memberId: 'john.d@example.com' },
    { id: 18, date: '2025-04-22', category: 'Honorarium', type: 'Expense', amount: 300.00, description: 'Guest speaker honorarium', memberId: undefined },
    { id: 19, date: '2025-04-15', category: "Pastor's Appreciation", type: 'Income', amount: 150.00, description: '', memberId: 'jane.s@example.com' },
    { id: 20, date: '2025-04-10', category: 'Events', type: 'Expense', amount: 750.00, description: 'Easter convention expenses', memberId: undefined },
    { id: 21, date: '2025-03-30', category: 'Tithe', type: 'Income', amount: 350.00, description: '', memberId: 'poku.solomon@example.com' },
    { id: 22, date: '2025-03-28', category: 'Donation', type: 'Income', amount: 1000.00, description: 'Anonymous donation for outreach', memberId: undefined, nonMemberName: 'A. Friend' },
    { id: 23, date: '2025-03-20', category: 'Maintenance', type: 'Expense', amount: 400.00, description: 'Sound system repair', memberId: undefined },
    { id: 24, date: '2025-03-10', category: 'Offering', type: 'Income', amount: 950.00, description: 'Mid-week service offering', memberId: undefined },
    { id: 25, date: '2025-02-28', category: 'Tithe', type: 'Income', amount: 120.00, description: '', memberId: 'awuah.victoria@example.com' },
    { id: 26, date: '2025-02-15', category: 'Salaries', type: 'Expense', amount: 1500.00, description: 'Pastoral staff salary', memberId: undefined },
    { id: 27, date: '2025-02-10', category: 'Seed', type: 'Income', amount: 200.00, description: 'First fruit seed', memberId: 'Kaboreaziz723@gmail.com' },
    { id: 28, date: '2025-01-31', category: 'Offering', type: 'Income', amount: 1100.00, description: 'End of month service', memberId: undefined },
    { id: 29, date: '2025-01-20', category: 'Outreach', type: 'Expense', amount: 600.00, description: 'Community outreach event', memberId: undefined },
    { id: 30, date: '2025-01-15', category: 'Tithe', type: 'Income', amount: 90.00, description: '', memberId: 'otoo.beatrice@example.com' },
];
