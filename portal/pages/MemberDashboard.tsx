import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Heart,
  LogOut,
  Download,
  User,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  ChevronRight,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { portalAuthService } from '../services/portalAuth';
import { portalApolloClient } from '../services/portalApollo';
import {
  GET_MEMBER_DASHBOARD_QUERY,
  UPDATE_MEMBER_PROFILE_MUTATION,
  SUBMIT_HELPDESK_TICKET_MUTATION,
} from '../services/portalQueries';
import { generateCSV } from '../utils/giving';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MemberData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  status: string;
  joined_at?: string;
  gender?: string;
  marital_status?: string;
  address?: string;
  occupation?: string;
  dob?: string;
}

interface Transaction {
  id: number;
  date: string;
  category: string;
  amount: number;
  description?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  service: string;
  status: string;
}

// ─── Helper components ───────────────────────────────────────────────────────
const SkeletonRow = () => <div className="animate-pulse bg-gray-200 h-10 rounded w-full mb-2" />;

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <AlertCircle className="text-red-500 mb-2" size={24} />
    <p className="text-red-600 mb-4">Could not load data. Please try again.</p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
    >
      <RefreshCw size={16} /> Retry
    </button>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-600',
    Transferred: 'bg-yellow-100 text-yellow-800',
    'Pending Fee': 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MemberDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const currentUser = portalAuthService.getCurrentUser();

  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<MemberData>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [ticketDepartment, setTicketDepartment] = useState('General');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticketError, setTicketError] = useState('');

  const fetchDashboard = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(false);
    try {
      const { data } = await portalApolloClient.query({
        query: GET_MEMBER_DASHBOARD_QUERY,
        variables: { memberId: currentUser.id },
        fetchPolicy: 'network-only',
      });
      setMemberData(data.membersCollection?.edges?.[0]?.node ?? null);
      setTransactions(data.transactionsCollection?.edges?.map((e: { node: Transaction }) => e.node) ?? []);
      setAttendance(data.attendance_recordsCollection?.edges?.map((e: { node: AttendanceRecord }) => e.node) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = () => {
    portalAuthService.logout();
    navigate('/portal/login');
  };

  const handleDownloadStatement = () => {
    const records = transactions.map((t) => ({
      id: String(t.id),
      member: currentUser?.id || '',
      date: t.date,
      type: t.category,
      amount_kes: t.amount,
      method: t.description || '',
    }));
    const csvStr = generateCSV(records);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `giving-statement-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartEdit = () => {
    if (!memberData) return;
    setProfileForm({
      phone: memberData.phone,
      email: memberData.email,
      address: memberData.address,
      occupation: memberData.occupation,
      marital_status: memberData.marital_status,
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    setSavingProfile(true);
    try {
      await portalApolloClient.mutate({
        mutation: UPDATE_MEMBER_PROFILE_MUTATION,
        variables: {
          id: currentUser.id,
          updates: {
            phone: profileForm.phone,
            email: profileForm.email,
            address: profileForm.address,
            occupation: profileForm.occupation,
            marital_status: profileForm.marital_status,
          },
        },
      });
      setProfileSaved(true);
      setIsEditing(false);
      await fetchDashboard();
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      alert('Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id || !ticketSubject || !ticketBody) return;
    setSubmittingTicket(true);
    setTicketError('');
    try {
      await portalApolloClient.mutate({
        mutation: SUBMIT_HELPDESK_TICKET_MUTATION,
        variables: {
          sender_id: currentUser.id,
          department: ticketDepartment,
          subject: ticketSubject,
          body: ticketBody,
        },
      });
      setTicketSubmitted(true);
      setTicketSubject('');
      setTicketBody('');
      setTicketDepartment('General');
    } catch {
      setTicketError('Failed to submit your message. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const ytdTotal = transactions
    .filter((t) => new Date(t.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, t) => sum + t.amount, 0);

  // ─── Render Functions ────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
          <div className="mt-2">
            {loading ? (
              <div className="h-6 bg-gray-200 animate-pulse rounded w-24" />
            ) : (
              <StatusBadge status={memberData?.status || 'Unknown'} />
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Department</p>
          {loading ? (
            <div className="h-6 bg-gray-200 animate-pulse rounded w-32 mt-2" />
          ) : (
            <p className="text-lg font-bold text-gray-900 mt-1">{memberData?.department || '—'}</p>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">YTD Giving</p>
          {loading ? (
            <div className="h-6 bg-gray-200 animate-pulse rounded w-28 mt-2" />
          ) : (
            <p className="text-lg font-bold text-gray-900 mt-1">
              {ytdTotal.toLocaleString('en-KE', { maximumFractionDigits: 0 })} KES
            </p>
          )}
          <p className="text-xs text-green-600 mt-1">Thank you for your faithfulness ❤️</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">My Details</h3>
          <button
            onClick={() => setActiveTab('profile')}
            className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors"
          >
            Edit <ChevronRight size={16} />
          </button>
        </div>
        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Membership No.:</span>{' '}
              <span className="font-medium">{memberData?.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>{' '}
              <span className="font-medium">{memberData?.phone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="font-medium">{memberData?.email || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Member Since:</span>{' '}
              <span className="font-medium">
                {memberData?.joined_at
                  ? new Date(memberData.joined_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Giving</h3>
          <button
            onClick={() => setActiveTab('giving')}
            className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : error ? (
          <ErrorState onRetry={fetchDashboard} />
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No giving records found.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 4).map((t) => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.category}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(t.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">{t.amount.toLocaleString('en-KE')} KES</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderGiving = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Giving History</h2>
        <button
          onClick={handleDownloadStatement}
          disabled={loading || transactions.length === 0}
          className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download size={16} /> Download Statement
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : error ? (
          <ErrorState onRetry={fetchDashboard} />
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No giving records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(t.date).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-bold">
                      {t.amount.toLocaleString('en-KE')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-700">
                    YTD Total ({new Date().getFullYear()})
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    {ytdTotal.toLocaleString('en-KE')} KES
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : error ? (
          <ErrorState onRetry={fetchDashboard} />
        ) : attendance.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(a.date).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{a.service}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${a.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
          >
            <Edit2 size={16} /> Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 text-sm text-white bg-blue-700 px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {profileSaved && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          <CheckCircle size={18} /> Profile updated successfully!
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-xs text-gray-400 mb-4 italic">
          You can only edit your personal contact details. For name changes or other corrections, please contact the
          church office.
        </p>
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Full Name', value: `${memberData?.first_name} ${memberData?.last_name}`.trim() },
              { label: 'Membership No.', value: memberData?.id },
              { label: 'Department', value: memberData?.department },
              { label: 'Status', value: memberData?.status },
              { label: 'Gender', value: memberData?.gender },
              {
                label: 'Member Since',
                value: memberData?.joined_at
                  ? new Date(memberData.joined_at).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{value || '—'}</p>
              </div>
            ))}
            {[
              { label: 'Phone Number', key: 'phone' },
              { label: 'Email Address', key: 'email' },
              { label: 'Home Address', key: 'address' },
              { label: 'Occupation', key: 'occupation' },
            ].map(({ label, key }) => (
              <div key={key}>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {label} {isEditing && <span className="text-blue-500">✎</span>}
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={(profileForm as Record<string, string>)[key] || ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                    {((memberData as Record<string, unknown>)?.[key] as string) || '—'}
                  </p>
                )}
              </div>
            ))}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Marital Status {isEditing && <span className="text-blue-500">✎</span>}
              </p>
              {isEditing ? (
                <select
                  value={profileForm.marital_status || ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, marital_status: e.target.value }))}
                  className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select…</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Widowed</option>
                  <option>Divorced</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {memberData?.marital_status || '—'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHelpdesk = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact & Helpdesk</h2>
      <p className="text-gray-500 text-sm">
        Have a question, complaint, or compliment? Send a message to our team and we'll get back to you.
      </p>
      {ticketSubmitted ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
          <p className="text-gray-500 mb-6">
            Your message has been received. Our team will follow up with you shortly.
          </p>
          <button
            onClick={() => setTicketSubmitted(false)}
            className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitTicket}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          {ticketError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              <AlertCircle size={18} /> {ticketError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={ticketDepartment}
              onChange={(e) => setTicketDepartment(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option>General</option>
              <option>Finance</option>
              <option>Membership</option>
              <option>Prayer</option>
              <option>Youth</option>
              <option>Events</option>
              <option>Welfare</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="Brief description of your message"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              required
              value={ticketBody}
              onChange={(e) => setTicketBody(e.target.value)}
              rows={5}
              placeholder="Write your message here…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submittingTicket}
            className="w-full flex items-center justify-center gap-2 text-white bg-blue-700 hover:bg-blue-800 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <MessageSquare size={18} /> {submittingTicket ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'attendance':
        return renderAttendance();
      case 'giving':
        return renderGiving();
      case 'profile':
        return renderProfile();
      case 'helpdesk':
        return renderHelpdesk();
      default:
        return renderDashboard();
    }
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'attendance', label: 'My Attendance', icon: CheckCircle },
    { key: 'giving', label: 'My Giving', icon: Heart },
    { key: 'profile', label: 'My Profile', icon: User },
    { key: 'helpdesk', label: 'Contact Us', icon: MessageSquare },
  ];

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-blue-900 text-white flex-shrink-0 md:min-h-screen">
          <div className="p-6 border-b border-blue-800">
            <h1 className="text-xl font-bold text-white">Member Portal</h1>
            <p className="text-xs text-blue-200 mt-1 truncate">Welcome, {currentUser?.full_name || 'Member'}</p>
            <p className="text-xs text-blue-400 mt-0.5">{currentUser?.id}</p>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-blue-800 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-blue-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-blue-800 hover:text-red-200 transition-colors"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </nav>
        </div>
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MemberDashboard;
