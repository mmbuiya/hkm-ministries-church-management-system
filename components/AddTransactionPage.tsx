
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from './Icons';
import { InputField, SelectField, TextAreaField } from './FormControls';
import { Member } from './memberData';
import { Transaction, IncomeCategory, ExpenseCategory } from './financeData';
import { CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';

interface AddTransactionPageProps {
    onBack: () => void;
    onSave: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
    transactionToEdit: Transaction | null;
    members: Member[];
}

const incomeCategories: IncomeCategory[] = ['Tithe', 'Offering', 'Project Offering', 'Pledge', 'Seed', "Pastor's Appreciation", 'Welfare', 'Children Service Offering', 'Donation', 'Church Bills Contribution', 'Others'];
const expenseCategories: ExpenseCategory[] = ['Utilities', 'Rent', 'Salaries', 'Supplies', 'Events', 'Maintenance', 'Outreach', 'Honorarium', 'Others'];
const memberRequiredCategories: IncomeCategory[] = ['Tithe', 'Welfare', 'Pledge', 'Seed', "Pastor's Appreciation", 'Church Bills Contribution'];


const AddTransactionPage: React.FC<AddTransactionPageProps> = ({ onBack, onSave, transactionToEdit, members }) => {
    const isEditMode = !!transactionToEdit;
    
    const [type, setType] = useState<'Income' | 'Expense'>('Income');
    const [category, setCategory] = useState<IncomeCategory | ExpenseCategory>('Tithe');
    const [memberId, setMemberId] = useState<string>('');
    
    // Debug memberId changes
    useEffect(() => {
        console.log('memberId state changed to:', memberId);
    }, [memberId]);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [isNonMember, setIsNonMember] = useState(false);
    const [nonMemberName, setNonMemberName] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingTransactionData, setPendingTransactionData] = useState<any>(null);
    
    useEffect(() => {
        if (isEditMode && transactionToEdit) {
            setType(transactionToEdit.type);
            setCategory(transactionToEdit.category);
            setMemberId(transactionToEdit.memberId || '');
            setAmount(transactionToEdit.amount.toString());
            setDate(transactionToEdit.date);
            setDescription(transactionToEdit.description);
            setIsNonMember(!!transactionToEdit.nonMemberName);
            setNonMemberName(transactionToEdit.nonMemberName || '');
            
            console.log('Edit mode - loaded transaction with memberId:', transactionToEdit.memberId);
        } else {
            // Reset form when not in edit mode
            console.log('Form reset - clearing memberId');
            setMemberId('');
        }
    }, [transactionToEdit, isEditMode]);

    useEffect(() => {
        if (isNonMember) {
            setMemberId('');
        } else {
            setNonMemberName('');
        }
    }, [isNonMember]);

    useEffect(() => {
        if (type === 'Expense') {
            setIsNonMember(false);
            setNonMemberName('');
            setMemberId('');
        }
    }, [type]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const isMemberRequired = type === 'Income' && !isNonMember && memberRequiredCategories.includes(category as IncomeCategory);
        if (isMemberRequired && !memberId) {
            alert('Please select a member for this transaction category.');
            return;
        }

        if (!category || !amount || !date) {
            alert('Please fill in all required fields.');
            return;
        }
        
        const transactionData = {
            type,
            category,
            amount: parseFloat(amount),
            date,
            description,
            memberId: type === 'Income' && !isNonMember && memberId ? memberId : undefined,
            nonMemberName: type === 'Income' && isNonMember && nonMemberName ? nonMemberName.trim() : undefined,
        };

        // Store the transaction data and show confirmation
        if (isEditMode) {
            setPendingTransactionData({ ...transactionData, id: transactionToEdit!.id });
        } else {
            setPendingTransactionData(transactionData);
        }
        setShowConfirmation(true);
    };

    const handleConfirmSave = () => {
        if (pendingTransactionData) {
            onSave(pendingTransactionData);
            setShowConfirmation(false);
            setPendingTransactionData(null);
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmation(false);
        setPendingTransactionData(null);
    };
    
    // Create member options - include all members from database
    // The useMembers hook should now provide fallback names for members without proper names
    const validMembers = members.filter(m => {
        // Very minimal filtering - just ensure we have some kind of name
        const hasName = m.name && typeof m.name === 'string' && m.name.trim().length > 0;
        return hasName;
    });
    
    // Check for duplicate names and handle them
    const memberCounts = validMembers.reduce((acc, member) => {
        acc[member.name] = (acc[member.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    // Add ID suffix for members with duplicate names to make them unique
    const memberOptions = validMembers.map(m => {
        if (memberCounts[m.name] > 1) {
            return `${m.name} (${m.id})`;
        }
        return m.name;
    });

    // Debug logging to see what's happening with member data
    console.log('=== Member Data Debug ===');
    console.log('Total members from DB:', members.length);
    console.log('Valid members after filtering:', validMembers.length);
    console.log('Duplicate names found:', Object.entries(memberCounts).filter(([name, count]) => count > 1));
    console.log('Current selected memberId:', memberId);
    console.log('Current selected member:', validMembers.find(m => m.email === memberId));

    return (
        <div>
            <div className="p-6 rounded-lg bg-white shadow-sm border mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit' : 'Add'} Financial Transaction</h1>
                        <p className="mt-1 text-gray-600">Fill in the form below to {isEditMode ? 'update the' : 'record a new'} transaction.</p>
                    </div>
                    <button onClick={onBack} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 flex items-center">
                        <ArrowLeftIcon className="w-4 h-4 mr-2"/> Back to Finances
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                        <div className="flex bg-gray-200 p-1 rounded-lg">
                            <button type="button" onClick={() => { setType('Income'); setCategory('Tithe'); }} className={`w-full py-2 rounded-md font-semibold ${type === 'Income' ? 'bg-white shadow' : 'text-gray-600'}`}>Income</button>
                            <button type="button" onClick={() => { setType('Expense'); setCategory('Utilities'); setMemberId(''); }} className={`w-full py-2 rounded-md font-semibold ${type === 'Expense' ? 'bg-white shadow' : 'text-gray-600'}`}>Expense</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <SelectField name="category" label={`${type} Category`} options={type === 'Income' ? incomeCategories : expenseCategories} value={category} onChange={e => setCategory(e.target.value as any)} required />
                         
                        {type === 'Income' ? (
                            <div>
                                <div className="flex items-center mb-1 h-6">
                                    <input type="checkbox" id="isNonMember" checked={isNonMember} onChange={e => setIsNonMember(e.target.checked)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"/>
                                    <label htmlFor="isNonMember" className="ml-2 text-sm font-medium text-gray-700">From Non-Member</label>
                                </div>
                                {isNonMember ? (
                                    <InputField name="nonMemberName" label="Non-Member Name" type="text" value={nonMemberName} onChange={e => setNonMemberName(e.target.value)} required />
                                ) : (
                                    <>
                                        {validMembers.length === 0 ? (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Member <span className="text-red-500">*</span>
                                                </label>
                                                <div className="p-3 border border-orange-300 rounded-lg bg-orange-50">
                                                    <p className="text-sm text-orange-700">
                                                        No active members with valid data found. Please ensure members have both names and email addresses, or use the "From Non-Member" option above.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <SelectField 
                                                name="member" 
                                                label="Member" 
                                                options={memberOptions} 
                                                value={(() => {
                                                    console.log('Calculating dropdown value. memberId:', memberId);
                                                    
                                                    if (!memberId) {
                                                        console.log('No memberId set, returning empty string');
                                                        return '';
                                                    }
                                                    
                                                    // Find member by ID instead of email
                                                    const member = validMembers.find(m => m.id === memberId);
                                                    console.log('Found member for dropdown:', member);
                                                    
                                                    if (!member) {
                                                        console.log('No member found with id:', memberId);
                                                        return '';
                                                    }
                                                    
                                                    // Check if this member name has duplicates
                                                    if (memberCounts[member.name] > 1) {
                                                        const displayValue = `${member.name} (${member.id})`;
                                                        console.log('Member has duplicates, showing:', displayValue);
                                                        return displayValue;
                                                    }
                                                    
                                                    console.log('Showing member name:', member.name);
                                                    return member.name;
                                                })()} 
                                                onChange={e => {
                                                    console.log('Member selection changed to:', e.target.value);
                                                    
                                                    // Handle both regular names and names with ID suffix
                                                    let selectedMember;
                                                    if (e.target.value.includes(' (') && e.target.value.endsWith(')')) {
                                                        // Extract ID from "Name (ID)" format
                                                        const idMatch = e.target.value.match(/\(([^)]+)\)$/);
                                                        const id = idMatch ? idMatch[1] : '';
                                                        selectedMember = validMembers.find(m => m.id === id);
                                                    } else {
                                                        // Find by exact name match
                                                        selectedMember = validMembers.find(m => m.name === e.target.value);
                                                    }
                                                    
                                                    console.log('Selected member object:', selectedMember);
                                                    // Use member ID instead of email since many members don't have emails
                                                    const newMemberId = selectedMember ? selectedMember.id : '';
                                                    console.log('Setting memberId to:', newMemberId);
                                                    setMemberId(newMemberId);
                                                }} 
                                                required={memberRequiredCategories.includes(category as IncomeCategory)} 
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        ) : <div />}

                         <InputField name="amount" label="Amount (KSH)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                         <InputField name="date" label="Transaction Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>

                    <TextAreaField label="Description" placeholder="Optional notes about the transaction" value={description} onChange={e => setDescription(e.target.value)} />
                    
                    <div className="flex justify-end pt-6 border-t">
                        <button type="button" onClick={onBack} className="bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg mr-4 hover:bg-gray-300">
                            Cancel
                        </button>
                        <button type="submit" className="bg-church-green-dark hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg">
                            {isEditMode ? 'Update' : 'Save'} Transaction
                        </button>
                    </div>
                </form>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && pendingTransactionData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Header */}
                        <div className={`p-4 border-b text-white rounded-t-xl ${
                            pendingTransactionData.type === 'Income' 
                                ? 'bg-gradient-to-r from-green-600 to-green-700' 
                                : 'bg-gradient-to-r from-red-600 to-red-700'
                        }`}>
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6" />
                                <h2 className="text-lg font-bold">
                                    {isEditMode ? 'Confirm Transaction Update' : 'Confirm Transaction Addition'}
                                </h2>
                            </div>
                            <p className={`text-sm mt-1 ${
                                pendingTransactionData.type === 'Income' ? 'text-green-100' : 'text-red-100'
                            }`}>
                                Please review the transaction details before saving
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className={`border rounded-lg p-4 ${
                                pendingTransactionData.type === 'Income' 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <DollarSign className={`w-5 h-5 mt-0.5 ${
                                        pendingTransactionData.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                    }`} />
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium mb-2 ${
                                            pendingTransactionData.type === 'Income' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            Transaction Details:
                                        </p>
                                        <div className={`space-y-1 text-sm ${
                                            pendingTransactionData.type === 'Income' ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            <p><strong>Type:</strong> {pendingTransactionData.type}</p>
                                            <p><strong>Category:</strong> {pendingTransactionData.category}</p>
                                            <p><strong>Amount:</strong> KSH {pendingTransactionData.amount.toLocaleString()}</p>
                                            <p><strong>Date:</strong> {new Date(pendingTransactionData.date).toLocaleDateString()}</p>
                                            {pendingTransactionData.memberId && (
                                                <p><strong>Member:</strong> {validMembers.find(m => m.id === pendingTransactionData.memberId)?.name}</p>
                                            )}
                                            {pendingTransactionData.nonMemberName && (
                                                <p><strong>Non-Member:</strong> {pendingTransactionData.nonMemberName}</p>
                                            )}
                                            {pendingTransactionData.description && (
                                                <p><strong>Description:</strong> {pendingTransactionData.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                                    <p className="text-sm text-blue-700">
                                        {isEditMode 
                                            ? 'This will update the existing transaction record.'
                                            : `This will record a new ${pendingTransactionData.type.toLowerCase()} transaction.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-xl">
                            <button
                                onClick={handleCancelConfirmation}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className={`px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 ${
                                    pendingTransactionData.type === 'Income' 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                <CheckCircle className="w-4 h-4" />
                                {isEditMode ? 'Update Transaction' : 'Add Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddTransactionPage;
