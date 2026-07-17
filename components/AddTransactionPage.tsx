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
  transactions?: Transaction[];
}

const incomeCategories: IncomeCategory[] = [
  'Tithe',
  'Offering',
  'Project Offering',
  'Pledge',
  'Seed',
  "Pastor's Appreciation",
  'Welfare',
  'Children Service Offering',
  'Donation',
  'Church Bills Contribution',
  'Registration Fee',
  'Others',
];
const expenseCategories: ExpenseCategory[] = [
  'Utilities',
  'Rent',
  'Salaries',
  'Supplies',
  'Events',
  'Maintenance',
  'Outreach',
  'Honorarium',
  'Others',
];
const memberRequiredCategories: IncomeCategory[] = [
  'Tithe',
  'Welfare',
  'Pledge',
  'Seed',
  "Pastor's Appreciation",
  'Church Bills Contribution',
  'Registration Fee',
];

const AddTransactionPage: React.FC<AddTransactionPageProps> = ({
  onBack,
  onSave,
  transactionToEdit,
  members,
  transactions,
}) => {
  const isEditMode = !!transactionToEdit;

  const [type, setType] = useState<'Income' | 'Expense'>('Income');
  const [category, setCategory] = useState<IncomeCategory | ExpenseCategory>('Tithe');
  const [memberId, setMemberId] = useState<string>('');

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

  // Registration Fee requires a member — auto-clear non-member toggle
  useEffect(() => {
    if (category === 'Registration Fee') {
      setIsNonMember(false);
      setNonMemberName('');
    }
  }, [category]);

  // Auto-clear category if fully registered member is selected
  useEffect(() => {
    if (memberId && category === 'Registration Fee') {
      const selectedMember = members.find((m) => m.id === memberId);
      if (selectedMember && (selectedMember.status === 'Active' || selectedMember.status === 'Transferred')) {
        setCategory('Tithe');
      }
    }
  }, [memberId, category, members]);

  const disabledIncomeCategories: IncomeCategory[] = [];
  const selectedMemberObj = members.find((m) => m.id === memberId);
  if (selectedMemberObj && (selectedMemberObj.status === 'Active' || selectedMemberObj.status === 'Transferred')) {
    disabledIncomeCategories.push('Registration Fee');
  }

  const isPendingFee = selectedMemberObj?.status === 'Pending Fee';
  const registrationThreshold = 500;
  const pastRegistrationFees =
    transactions && memberId
      ? transactions
          .filter((t) => t.memberId === memberId && t.category === 'Registration Fee')
          .reduce((sum, t) => sum + t.amount, 0)
      : 0;
  const currentAmount = parseFloat(amount) || 0;
  const projectedTotal = pastRegistrationFees + currentAmount;
  const registrationBalance = Math.max(0, registrationThreshold - pastRegistrationFees);
  const thresholdMetOnSave = projectedTotal >= registrationThreshold;
  const hasEmail = !!selectedMemberObj?.email;
  const hasPhone = !!selectedMemberObj?.phone;
  const hasContact = hasEmail || hasPhone;
  const missingContactFields: string[] = [];
  if (!hasEmail) missingContactFields.push('Email');
  if (!hasPhone) missingContactFields.push('Phone');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !amount || !date) {
      alert('Please fill in all required fields.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    const isMemberRequired =
      type === 'Income' && !isNonMember && memberRequiredCategories.includes(category as IncomeCategory);
    if (isMemberRequired && !memberId) {
      alert('Please select a member for this transaction category.');
      return;
    }

    const transactionData = {
      type,
      category,
      amount: parsedAmount,
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

  const handleConfirmSave = async () => {
    if (pendingTransactionData) {
      try {
        await onSave(pendingTransactionData);
      } catch (err) {
        console.error('[Save] onSave failed:', err);
      } finally {
        setShowConfirmation(false);
        setPendingTransactionData(null);
      }
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingTransactionData(null);
  };

  // Create member options - include all members from database
  // The useMembers hook should now provide fallback names for members without proper names
  const validMembers = members.filter((m) => {
    // Very minimal filtering - just ensure we have some kind of name
    const hasName = m.name && typeof m.name === 'string' && m.name.trim().length > 0;
    return hasName;
  });

  // Check for duplicate names and handle them
  const memberCounts = validMembers.reduce(
    (acc, member) => {
      acc[member.name] = (acc[member.name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Add ID suffix for members with duplicate names to make them unique
  const memberOptions = validMembers.map((m) => {
    if (memberCounts[m.name] > 1) {
      return `${m.name} (${m.id})`;
    }
    return m.name;
  });

  return (
    <div>
      <div className="p-6 rounded-lg bg-white shadow-sm border mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit' : 'Add'} Financial Transaction</h1>
            <p className="mt-1 text-gray-600">
              Fill in the form below to {isEditMode ? 'update the' : 'record a new'} transaction.
            </p>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 flex items-center"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Finances
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setType('Income');
                  setCategory('Tithe');
                }}
                className={`w-full py-2 rounded-md font-semibold ${type === 'Income' ? 'bg-white shadow' : 'text-gray-600'}`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('Expense');
                  setCategory('Utilities');
                  setMemberId('');
                }}
                className={`w-full py-2 rounded-md font-semibold ${type === 'Expense' ? 'bg-white shadow' : 'text-gray-600'}`}
              >
                Expense
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField
              name="category"
              label={`${type} Category`}
              options={type === 'Income' ? incomeCategories : expenseCategories}
              disabledOptions={type === 'Income' ? disabledIncomeCategories : []}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              required
            />

            {type === 'Income' ? (
              <div>
                <div className="flex items-center mb-1 h-6">
                  <input
                    type="checkbox"
                    id="isNonMember"
                    checked={isNonMember}
                    onChange={(e) => setIsNonMember(e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={category === 'Registration Fee'}
                  />
                  <label
                    htmlFor="isNonMember"
                    className={`ml-2 text-sm font-medium ${category === 'Registration Fee' ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    From Non-Member{' '}
                    {category === 'Registration Fee' && (
                      <span className="text-xs text-orange-600">(N/A for Registration Fee)</span>
                    )}
                  </label>
                </div>
                {isNonMember ? (
                  <InputField
                    name="nonMemberName"
                    label="Non-Member Name"
                    type="text"
                    value={nonMemberName}
                    onChange={(e) => setNonMemberName(e.target.value)}
                    required
                  />
                ) : (
                  <>
                    {validMembers.length === 0 ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Member <span className="text-red-500">*</span>
                        </label>
                        <div className="p-3 border border-orange-300 rounded-lg bg-orange-50">
                          <p className="text-sm text-orange-700">
                            No active members with valid data found. Please ensure members have both names and email
                            addresses, or use the "From Non-Member" option above.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <SelectField
                          name="member"
                          label="Member"
                          options={memberOptions}
                          value={(() => {
                            if (!memberId) return '';
                            const member = validMembers.find((m) => m.id === memberId);
                            if (!member) return '';
                            if (memberCounts[member.name] > 1) return `${member.name} (${member.id})`;
                            return member.name;
                          })()}
                          onChange={(e) => {
                            let selectedMember;
                            if (e.target.value.includes(' (') && e.target.value.endsWith(')')) {
                              const idMatch = e.target.value.match(/\(([^)]+)\)$/);
                              const id = idMatch ? idMatch[1] : '';
                              selectedMember = validMembers.find((m) => m.id === id);
                            } else {
                              selectedMember = validMembers.find((m) => m.name === e.target.value);
                            }
                            const newMemberId = selectedMember ? selectedMember.id : '';
                            setMemberId(newMemberId);
                          }}
                          required={memberRequiredCategories.includes(category as IncomeCategory)}
                        />
                        {category === 'Registration Fee' && memberId && (
                          <div className="mt-3 space-y-2">
                            <div
                              className={`text-sm p-3 rounded border ${
                                isPendingFee
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : selectedMemberObj?.status === 'Active'
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <strong>Registration Status:</strong>
                              <ul className="mt-1 space-y-1 list-disc list-inside">
                                <li>
                                  Paid: KSH {pastRegistrationFees} / KSH {registrationThreshold}
                                </li>
                                {currentAmount > 0 && (
                                  <li>
                                    After this entry: KSH {projectedTotal} / KSH {registrationThreshold}
                                  </li>
                                )}
                                <li>
                                  Contact:{' '}
                                  {missingContactFields.length === 0
                                    ? 'Complete'
                                    : `Missing: ${missingContactFields.join(', ')}`}
                                </li>
                              </ul>
                            </div>
                            {thresholdMetOnSave && isPendingFee && (
                              <div
                                className={`text-sm p-3 rounded border ${
                                  hasContact
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-red-50 border-red-200 text-red-700'
                                }`}
                              >
                                {hasContact ? (
                                  <span>
                                    <strong>Ready to Activate:</strong> Threshold met and contact details present.
                                    Portal PIN will be generated and sent to the member.
                                  </span>
                                ) : (
                                  <span>
                                    <strong>Cannot Activate:</strong> Threshold met but{' '}
                                    {missingContactFields.join(' and ')} is missing. Update the member&apos;s profile
                                    with {missingContactFields.join(' and ')} before saving.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div />
            )}

            <InputField
              name="amount"
              label="Amount (KSH)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <InputField
              name="date"
              label="Transaction Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <TextAreaField
            label="Description"
            placeholder="Optional notes about the transaction"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg mr-4 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-church-green-dark hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
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
            <div
              className={`p-4 border-b text-white rounded-t-xl ${
                pendingTransactionData.type === 'Income'
                  ? 'bg-gradient-to-r from-green-600 to-green-700'
                  : 'bg-gradient-to-r from-red-600 to-red-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                <h2 className="text-lg font-bold">
                  {isEditMode ? 'Confirm Transaction Update' : 'Confirm Transaction Addition'}
                </h2>
              </div>
              <p
                className={`text-sm mt-1 ${
                  pendingTransactionData.type === 'Income' ? 'text-green-100' : 'text-red-100'
                }`}
              >
                Please review the transaction details before saving
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div
                className={`border rounded-lg p-4 ${
                  pendingTransactionData.type === 'Income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <DollarSign
                    className={`w-5 h-5 mt-0.5 ${
                      pendingTransactionData.type === 'Income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium mb-2 ${
                        pendingTransactionData.type === 'Income' ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      Transaction Details:
                    </p>
                    <div
                      className={`space-y-1 text-sm ${
                        pendingTransactionData.type === 'Income' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      <p>
                        <strong>Type:</strong> {pendingTransactionData.type}
                      </p>
                      <p>
                        <strong>Category:</strong> {pendingTransactionData.category}
                      </p>
                      <p>
                        <strong>Amount:</strong> KSH {pendingTransactionData.amount.toLocaleString()}
                      </p>
                      <p>
                        <strong>Date:</strong> {new Date(pendingTransactionData.date).toLocaleDateString()}
                      </p>
                      {pendingTransactionData.memberId && (
                        <p>
                          <strong>Member:</strong>{' '}
                          {validMembers.find((m) => m.id === pendingTransactionData.memberId)?.name}
                        </p>
                      )}
                      {pendingTransactionData.nonMemberName && (
                        <p>
                          <strong>Non-Member:</strong> {pendingTransactionData.nonMemberName}
                        </p>
                      )}
                      {pendingTransactionData.description && (
                        <p>
                          <strong>Description:</strong> {pendingTransactionData.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Fee special notice */}
              {pendingTransactionData.category === 'Registration Fee' && pendingTransactionData.memberId && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold">Portal Activation Will Trigger:</p>
                      <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs">
                        <li>
                          Member status set to <strong>Active</strong>
                        </li>
                        <li>A unique 6-digit PIN will be auto-generated</li>
                        <li>Member portal access will be enabled</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700">
                    {isEditMode
                      ? 'This will update the existing transaction record.'
                      : `This will record a new ${pendingTransactionData.type.toLowerCase()} transaction.`}
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
