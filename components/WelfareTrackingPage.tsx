
import React, { useState, useMemo } from 'react';
import { UsersIcon, CurrencyDollarIcon, PlusIcon, EyeIcon, FilterIcon, SearchIcon } from './Icons';
import { Transaction } from './financeData';
import { Member } from './memberData';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg mr-4">
            <Icon className="h-6 w-6" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const departments = ["Choir", "Media", "Ushering", "Children", "New Breed", "Protocol", "Welfare", "Intercessors", "Traffic", "Administration", "Instrumentalist", "Deacon"];
const statuses: Member['status'][] = ["Active", "Inactive", "Transferred"];

interface WelfareTrackingPageProps {
    setActiveView: (view: string) => void;
    setActivePage: (page: string) => void;
    transactions: Transaction[];
    members: Member[];
}

const WelfareTrackingPage: React.FC<WelfareTrackingPageProps> = ({ setActiveView, setActivePage, transactions, members }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedStatus, setSelectedStatus] = useState('All Statuses');

    const welfareRecords = useMemo(() => {
        return transactions.filter(t => {
            const isWelfare = t.category === 'Welfare';
            const matchesDate = t.date.startsWith(selectedMonth);
            
            if (!isWelfare || !matchesDate) return false;

            if (selectedDepartment === 'All Departments' && selectedStatus === 'All Statuses') return true;

            const member = members.find(m => m.email === t.memberId);
            if (!member) return false;

            const matchesDept = selectedDepartment === 'All Departments' || member.department === selectedDepartment;
            const matchesStatus = selectedStatus === 'All Statuses' || member.status === selectedStatus;

            return matchesDept && matchesStatus;
        });
    }, [transactions, selectedMonth, selectedDepartment, selectedStatus, members]);

    const stats = useMemo(() => {
        const totalWelfare = welfareRecords.reduce((sum, t) => sum + t.amount, 0);
        const membersPaying = new Set(welfareRecords.map(t => t.memberId)).size;
        
        // Calculate total eligible members based on filters for accurate participation rate
        const eligibleMembers = members.filter(m => {
             const matchesDept = selectedDepartment === 'All Departments' || m.department === selectedDepartment;
             const matchesStatus = selectedStatus === 'All Statuses' || m.status === selectedStatus;
             return matchesDept && matchesStatus;
        }).length;

        const participation = eligibleMembers > 0 ? (membersPaying / eligibleMembers) * 100 : 0;
        const averageWelfare = membersPaying > 0 ? totalWelfare / membersPaying : 0;
        return { totalWelfare, membersPaying, participation, averageWelfare };
    }, [welfareRecords, selectedDepartment, selectedStatus, members]);

    const memberWelfareData = useMemo(() => {
        const memberData = new Map<string, { total: number, lastDate: string }>();
        welfareRecords.forEach(t => {
            if (t.memberId) {
                const existing = memberData.get(t.memberId) || { total: 0, lastDate: '1970-01-01' };
                existing.total += t.amount;
                if (t.date > existing.lastDate) {
                    existing.lastDate = t.date;
                }
                memberData.set(t.memberId, existing);
            }
        });
        
        return Array.from(memberData.entries()).map(([memberId, data]) => {
            const member = members.find(m => m.email === memberId);
            return { memberId, name: member?.name, phone: member?.phone, status: member?.status, ...data };
        }).filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    }, [welfareRecords, searchTerm, members]);

    const handleResetFilters = () => {
        setSelectedDepartment('All Departments');
        setSelectedStatus('All Statuses');
        setSearchTerm('');
        setSelectedMonth(new Date().toISOString().slice(0, 7));
    };

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-lg bg-white shadow-sm border">
                 <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welfare Tracking</h1>
                        <p className="mt-1 text-gray-600">Track and manage member welfare payments.</p>
                    </div>
                     <div className="flex gap-2">
                        <button onClick={() => setActivePage('Add Transaction')} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Add Welfare</button>
                        <button onClick={() => setActiveView('Dashboard')} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Back to Finance</button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center mb-3">
                    <FilterIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-md font-semibold text-gray-700">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Month</label>
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full border-gray-300 rounded-lg px-3 py-2 border shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                    </div>
                    <div className="lg:col-span-2">
                         <label className="text-xs font-medium text-gray-500 mb-1 block">Search Member</label>
                         <div className="relative">
                            <SearchIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                            <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border-gray-300 rounded-lg pl-10 pr-3 py-2 border shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                         </div>
                    </div>
                    <div>
                         <label className="text-xs font-medium text-gray-500 mb-1 block">Department</label>
                         <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="w-full border-gray-300 rounded-lg px-3 py-2 border shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                            <option value="All Departments">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                         <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full border-gray-300 rounded-lg px-3 py-2 border shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                            <option value="All Statuses">All Statuses</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Welfare Collected" value={`KSH ${stats.totalWelfare.toFixed(2)}`} icon={CurrencyDollarIcon} />
                <StatCard title="Members Paying" value={`${stats.membersPaying} (${stats.participation.toFixed(1)}%)`} icon={UsersIcon} />
                <StatCard title="Average Amount" value={`KSH ${stats.averageWelfare.toFixed(2)}`} icon={CurrencyDollarIcon} />
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-700">Members Welfare Records</h3>
                    <button onClick={handleResetFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Reset Filters</button>
                </div>
                 <div className="overflow-auto max-h-[65vh]">
                    <table className="w-full text-sm text-left text-gray-500 relative">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Member</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Total Welfare</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Last Payment Date</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Status</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                           {memberWelfareData.map(m => (
                               <tr key={m.memberId} className="bg-white border-b hover:bg-gray-50">
                                   <td className="px-6 py-4">
                                       <div className="font-semibold capitalize">{m.name}</div>
                                       <div className="text-xs text-gray-500">{m.phone}</div>
                                   </td>
                                   <td className="px-6 py-4 font-bold text-gray-700">KSH {m.total.toFixed(2)}</td>
                                   <td className="px-6 py-4">{new Date(m.lastDate).toLocaleDateString('en-GB')}</td>
                                   <td className="px-6 py-4">
                                       <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${m.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                           {m.status || 'Unknown'}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4">
                                       <div className="flex items-center space-x-2">
                                           <button onClick={() => setActivePage('Add Transaction')} className="text-green-600 hover:text-green-800 p-1"><PlusIcon className="w-5 h-5"/></button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                           {memberWelfareData.length === 0 && (
                               <tr>
                                   <td colSpan={5} className="text-center py-8 text-gray-500">
                                       No welfare records found matching the current filters.
                                   </td>
                               </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WelfareTrackingPage;
