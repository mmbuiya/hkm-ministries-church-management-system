
import React, { useState, useMemo } from 'react';
import { PencilIcon, TrashIcon, SearchIcon } from './Icons';
import { Transaction } from './financeData';
import { Member } from './memberData';
import ActionButtons from './ActionButtons';

interface TransactionsListPageProps {
    setActiveView: (view: string) => void;
    setActivePage: (page: string) => void;
    transactions: Transaction[];
    members: Member[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: number) => void;
}

const TransactionsListPage: React.FC<TransactionsListPageProps> = ({ setActiveView, setActivePage, transactions, members, onEdit, onDelete }) => {
    const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleReset = () => {
        setFilterType('All');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    const getContributorName = (transaction: Transaction) => {
        if (transaction.memberId) {
            const member = members.find(m => m.email === transaction.memberId);
            return member ? member.name : 'Unknown Member';
        }
        if (transaction.nonMemberName) {
            return `${transaction.nonMemberName} (Non-Member)`;
        }
        return '-';
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const contributorName = getContributorName(t);

            const matchesType = filterType === 'All' || t.type === filterType;

            const transactionDate = new Date(t.date);
            const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
            const matchesEndDate = !endDate || transactionDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));

            const matchesSearch = searchTerm === '' ||
                t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.amount.toString().includes(searchTerm);
            
            return matchesType && matchesStartDate && matchesEndDate && matchesSearch;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, filterType, startDate, endDate, searchTerm, members]);

    const getCategoryChip = (type: string, category: string) => {
        const color = type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>{category}</span>;
    }

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-lg bg-white shadow-sm border">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Transaction Records</h1>
                        <p className="mt-1 text-gray-600">View and manage all financial transactions.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setActivePage('Add Transaction')} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Add Transaction</button>
                        <button onClick={() => setActiveView('Dashboard')} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Finance Dashboard</button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-500">Search</label>
                        <div className="relative mt-1">
                             <SearchIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                             <input
                                type="text"
                                placeholder="Category, member, amount..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Type</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg text-sm mt-1">
                            <button onClick={() => setFilterType('All')} className={`w-full text-center py-1 rounded-md font-semibold ${filterType === 'All' ? 'bg-white shadow' : 'text-gray-600'}`}>All</button>
                            <button onClick={() => setFilterType('Income')} className={`w-full text-center py-1 rounded-md font-semibold ${filterType === 'Income' ? 'bg-white shadow' : 'text-gray-600'}`}>Inc</button>
                            <button onClick={() => setFilterType('Expense')} className={`w-full text-center py-1 rounded-md font-semibold ${filterType === 'Expense' ? 'bg-white shadow' : 'text-gray-600'}`}>Exp</button>
                        </div>
                    </div>
                    <button onClick={handleReset} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Reset</button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                 <div className="p-4 border-b">
                    <h3 className="text-md font-semibold text-gray-700">
                        Showing {filteredTransactions.length} of {transactions.length} transactions
                    </h3>
                </div>
                <div className="overflow-auto max-h-[65vh]">
                    <table className="w-full text-sm text-left text-gray-500 relative">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                             <tr>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Date</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Category</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Amount</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Description</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Contributor</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB', { day:'2-digit', month: 'short', year: 'numeric'})}</td>
                                    <td className="px-6 py-4">{getCategoryChip(t.type, t.category)}</td>
                                    <td className={`px-6 py-4 font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>KSH {t.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{t.description || '-'}</td>
                                    <td className="px-6 py-4 capitalize">{getContributorName(t)}</td>
                                    <td className="px-6 py-4">
                                        <ActionButtons
                                            onEdit={() => onEdit(t)}
                                            onDelete={() => onDelete(t.id)}
                                            itemName={`${t.category} - KSH ${t.amount.toLocaleString()}`}
                                            itemType="Transaction"
                                            itemDetails={{
                                                'Type': t.type,
                                                'Category': t.category,
                                                'Amount': `KSH ${t.amount.toLocaleString()}`,
                                                'Date': new Date(t.date).toLocaleDateString(),
                                                'Contributor': getContributorName(t)
                                            }}
                                            size="md"
                                            variant="icon"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredTransactions.length === 0 && <p className="text-center p-8 text-gray-500">No transactions found for the selected criteria.</p>}
                </div>
            </div>
        </div>
    );
};

export default TransactionsListPage;
