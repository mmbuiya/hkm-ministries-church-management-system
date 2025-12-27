
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardPage from './DashboardPage';
import MembersPage from './MembersPage';
import BirthdaysPage from './BirthdaysPage';
import AddMemberPage from './AddMemberPage';
import MemberDetailsPage from './MemberDetailsPage';
import GroupsManagementPage, { Group } from './GroupsManagementPage';
import AttendanceModule from './AttendanceModule';
import MarkAttendancePage from './MarkAttendancePage';
import AddTransactionPage from './AddTransactionPage';
import SmsBroadcastPage from './SmsBroadcastPage';
import FinancePage from './FinancePage';
import EquipmentPage from './EquipmentPage';
import AddEquipmentPage from './AddEquipmentPage';
import AddMaintenancePage from './AddMaintenancePage';
import VisitorsModule from './VisitorsModule';
import ReportsModule from './ReportsModule';
import UsersPage from './UsersPage';
import AddUserPage from './AddUserPage';
import SettingsPage from './SettingsPage';
import AiFeaturesPage from './AiFeaturesPage';
import BranchesPage from './BranchesPage';
import AddBranchPage from './AddBranchPage';
import DataPersonnelManagementPage from './DataPersonnelManagementPage';
import RecycleBinPage from './RecycleBinPage';
import PermissionRequestsPage from './PermissionRequestsPage';
import SuperAdminLogin from './SuperAdminLogin';
import QuickNav from './QuickNav';
import UserSessionMonitor from './UserSessionMonitor';
import { AttendanceStatus, AttendanceRecord } from './attendanceData';
import { Transaction } from './financeData';
import { Member } from './memberData';
import { Equipment } from './equipmentData';
import { MaintenanceRecord } from './maintenanceData';
import { SmsRecord } from './smsData';
import { Visitor, FollowUp } from './visitorData';
import { User, RecycleBinItem } from './userData';
import { Branch } from './branchData';
import { useToast } from './ToastContext';
import { fbService } from '../services/firebaseService';
import { canAccessSection, canManageUsers, canManageDataPersonnel } from './AccessControl';
import { useTheme } from './ThemeContext';
import {
  useRealtimePermissionRequests
} from '../hooks/useRealtimeData';
import { useMembers } from '../hooks/useMembers';
import { useTransactions } from '../hooks/useTransactions';
import { useAttendance } from '../hooks/useAttendance';
import { useVisitors } from '../hooks/useVisitors';
import { useGroups } from '../hooks/useGroups';
import { useEquipment } from '../hooks/useEquipment';
import { useSms } from '../hooks/useSms';
import { useUsersHasura } from '../hooks/useUsersHasura';
import { useBranches } from '../hooks/useBranches';
import { useRecycleBin } from '../hooks/useRecycleBin';
import { usePermissionRequests } from '../hooks/usePermissionRequests';

interface MainLayoutProps {
  currentUser: User | null;
  users: User[];
  onSaveOrUpdateUser: (userData: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ currentUser, onLogout }) => {
  const { showToast } = useToast();
  const { modeColors } = useTheme();

  const [activePage, setActivePage] = useState(() => {
    return sessionStorage.getItem('hkm_active_page') || 'Dashboard';
  });

  // Real-time data hooks
  const { data: members, setData: setMembers, loading: membersLoading, addMember, updateMember, deleteMember } = useMembers();
  const { data: visitors, loading: visitorsLoading, addVisitor, updateVisitor, deleteVisitor, addFollowUp, deleteFollowUp } = useVisitors();
  const { data: groups, loading: groupsLoading, addGroup, updateGroup, deleteGroup } = useGroups(members);
  const { data: attendanceRecords, loading: attendanceLoading, batchSaveAttendance, deleteAttendanceRecord } = useAttendance(members);
  const { data: transactions, setData: setTransactions, loading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { equipment, maintenanceRecords, loading: equipmentLoading, addEquipment, updateEquipment, deleteEquipment, addMaintenance, updateMaintenance, deleteMaintenance } = useEquipment();
  const { data: smsRecords, loading: smsLoading, addSmsRecord, deleteSmsRecord } = useSms();
  const { data: branches, loading: branchesLoading, addBranch, updateBranch, deleteBranch } = useBranches();
  const { data: recycleBinItems, moveToRecycleBin, removeFromRecycleBin, loading: recycleBinLoading } = useRecycleBin();
  const { users: allUsers, loading: usersLoading, upsertUser: onSaveOrUpdateUser, deleteUser: onDeleteUser } = useUsersHasura();
  const { data: permissionRequests, addRequest, updateRequest, deleteRequest, loading: permissionRequestsLoading } = usePermissionRequests();

  // Combined loading state
  const isLoading = membersLoading || visitorsLoading || groupsLoading || attendanceLoading ||
    transactionsLoading || equipmentLoading || smsLoading || branchesLoading || recycleBinLoading || permissionRequestsLoading || usersLoading;

  // Edit/View Context States
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberToView, setMemberToView] = useState<Member | null>(null);
  const [editContext, setEditContext] = useState<{ date: string, service: string } | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<MaintenanceRecord | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);

  useEffect(() => {
    sessionStorage.setItem('hkm_active_page', activePage);

    // Reload users when Users page is opened
    if (activePage === 'Users') {
      // Users are now loaded via Hasura GraphQL with real-time polling
      // No need for manual reload as the hook handles real-time updates
    }
  }, [activePage]);

  // Update Groups Logic (now with real-time data)
  useEffect(() => {
    if (members.length === 0 || groups.length === 0) return;

    const updateGroupStats = async () => {
      let needsUpdate = false;
      const updatedGroups = groups.map(group => {
        const membersInDept = members.filter(m => m.department === group.name);
        const leader = membersInDept.find(m => m.role === 'Leader') || membersInDept[0];
        const newMemberCount = membersInDept.length;
        const newLeaderEmail = leader ? leader.email : group.leader;

        if (group.members !== newMemberCount || group.leader !== newLeaderEmail) {
          needsUpdate = true;
          const updatedGroup = { ...group, members: newMemberCount, leader: newLeaderEmail };
          fbService.groups.save(updatedGroup);
          return updatedGroup;
        }
        return group;
      });

      if (needsUpdate) {
        // Groups will be updated via real-time subscription
      }
    };
    updateGroupStats();
  }, [members, groups]);


  // --- Member Handlers ---
  const handleSaveOrUpdateMember = async (memberData: Partial<Member>) => {
    try {
      const existingMember = members.find(m => m.email === memberData.email);
      if (existingMember && existingMember.id !== memberToEdit?.id) {
        showToast("A member with this email already exists.", 'warning');
        return;
      }

      if (memberToEdit) { // Update
        await updateMember(memberToEdit.id, memberData);
        showToast("Member updated successfully!", 'success');
      } else { // Create
        const generateNewId = (currentMembers: Member[]): string => {
          if (currentMembers.length === 0) return 'HKM-001';
          const numericIds = currentMembers.map(m => parseInt(m.id.split('-')[1], 10)).filter(n => !isNaN(n));
          const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
          return `HKM-${String(maxId + 1).padStart(3, '0')}`;
        };
        const newId = generateNewId(members);
        const newMemberRecord: Partial<Member> = {
          id: newId,
          name: memberData.name!,
          title: memberData.title || '',
          avatar: memberData.avatar || `https://ui-avatars.com/api/?name=${memberData.name}`,
          phone: memberData.phone!,
          email: memberData.email!,
          department: memberData.department || 'None',
          role: memberData.role || 'Member',
          status: memberData.status || 'Active',
          dateAdded: new Date().toISOString().split('T')[0],
          dob: memberData.dob || '',
          gender: memberData.gender!,
          occupation: memberData.occupation,
          maritalStatus: memberData.maritalStatus,
          location: memberData.location,
          avatarTransform: memberData.avatarTransform,
        };
        await addMember(newMemberRecord);
        showToast("New member added successfully!", 'success');
      }

      setMemberToEdit(null);
      setActivePage('Members');
    } catch (error) {
      console.error('Error in handleSaveOrUpdateMember:', error);
      showToast(`Error saving member: ${error.message || error}`, 'error');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        const memberToDelete = members.find(m => m.id === id);
        if (memberToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'Member',
            id,
            memberToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }

        await deleteMember(id);
        showToast("Member moved to recycle bin.", 'info');
        if (activePage === 'Member Details') {
          setActivePage('Members');
          setMemberToView(null);
        }
      } catch (error) {
        showToast("Failed to delete member", 'error');
      }
    }
  };

  // --- Group Handlers ---
  const handleSaveOrUpdateGroup = async (groupData: Partial<Group>) => {
    try {
      if (groupData.id) { // Update
        await updateGroup(groupData.id, groupData);
        showToast("Group updated.", 'success');
      } else { // Add
        await addGroup(groupData);
        showToast("Group created.", 'success');
      }
    } catch (error) {
      showToast("Failed to save group", 'error');
    }
    setGroupToEdit(null);
  };

  const handleDeleteGroup = async (id: number) => {
    if (window.confirm('Delete this group?')) {
      try {
        const groupToDelete = groups.find(g => g.id === id);
        if (groupToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'Group',
            id,
            groupToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteGroup(id);
        showToast("Group moved to recycle bin.", 'info');
      } catch (error) {
        showToast("Failed to delete group", 'error');
      }
    }
  };

  // --- Attendance Handlers ---
  const handleSaveAttendance = async (newAttendance: Record<string, AttendanceStatus>, serviceName: string, serviceDate: string) => {
    try {
      await batchSaveAttendance(newAttendance, serviceName, serviceDate);
      setEditContext(null);
      showToast("Attendance saved successfully!", 'success');
      setActivePage('Attendance');
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast("Failed to save attendance", 'error');
    }
  };

  const handleDeleteAttendanceRecord = async (id: number) => {
    if (window.confirm('Delete this record?')) {
      try {
        const attendanceToDelete = attendanceRecords.find(a => a.id === id);
        if (attendanceToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'AttendanceRecord',
            id,
            attendanceToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteAttendanceRecord(id);
        showToast("Attendance record moved to recycle bin.", 'info');
      } catch (error) {
        showToast("Failed to delete record", 'error');
      }
    }
  };

  // --- Transaction Handlers ---
  const handleSaveOrUpdateTransaction = async (transactionData: Omit<Transaction, 'id'> | Transaction) => {
    try {
      if ('id' in transactionData) { // Update
        const updated = transactionData as Transaction;
        await updateTransaction(updated.id, transactionData);
        showToast("Transaction updated.", 'success');
      } else { // Add
        await addTransaction(transactionData);
        showToast("Transaction recorded.", 'success');
      }
      setTransactionToEdit(null);
      setActivePage('Finance');
    } catch (error) {
      console.error("Error saving transaction:", error);
      showToast("Failed to save transaction", 'error');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (window.confirm('Delete transaction?')) {
      try {
        const transactionToDelete = transactions.find(t => t.id === id);
        if (transactionToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'Transaction',
            id,
            transactionToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteTransaction(id);
        showToast("Transaction moved to recycle bin.", 'info');
      } catch (error) {
        console.error("Error deleting transaction:", error);
        showToast("Failed to delete transaction", 'error');
      }
    }
  };

  // --- Equipment Handlers ---
  const handleSaveOrUpdateEquipment = async (equipmentData: Omit<Equipment, 'id'> | Equipment) => {
    try {
      if ('id' in equipmentData) {
        await updateEquipment(equipmentData.id, equipmentData);
        showToast("Equipment updated.", 'success');
      } else {
        await addEquipment(equipmentData);
        showToast("Equipment added.", 'success');
      }
      setEquipmentToEdit(null);
      setActivePage('Equipment');
    } catch (error) {
      showToast("Failed to save equipment", 'error');
    }
  };

  const handleDeleteEquipment = async (id: number) => {
    if (window.confirm('Delete equipment?')) {
      try {
        const equipmentToDelete = equipment.find(e => e.id === id);
        if (equipmentToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'Equipment',
            id,
            equipmentToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteEquipment(id);
        showToast("Equipment moved to recycle bin.", 'info');
      } catch (error) {
        showToast("Failed to delete equipment", 'error');
      }
    }
  };

  // --- Maintenance Handlers ---
  const handleSaveOrUpdateMaintenance = async (recordData: Omit<MaintenanceRecord, 'id'> | MaintenanceRecord) => {
    try {
      if ('id' in recordData) {
        await updateMaintenance(recordData.id, recordData);
        showToast("Maintenance record updated.", 'success');
      } else {
        await addMaintenance(recordData);
        showToast("Maintenance record added.", 'success');
      }
      setMaintenanceToEdit(null);
      setActivePage('Equipment');
    } catch (error) {
      showToast("Failed to save maintenance record", 'error');
    }
  };

  const handleDeleteMaintenance = async (id: number) => {
    if (window.confirm('Delete record?')) {
      try {
        const maintenanceToDelete = maintenanceRecords.find(m => m.id === id);
        if (maintenanceToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'MaintenanceRecord',
            id,
            maintenanceToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteMaintenance(id);
        showToast("Maintenance record moved to recycle bin.", 'info');
      } catch (error) {
        showToast("Failed to delete record", 'error');
      }
    }
  };

  // --- Visitor Handlers ---
  const handleSaveOrUpdateVisitor = async (visitorData: Partial<Visitor>) => {
    try {
      if (visitorData.id) {
        await updateVisitor(visitorData.id, visitorData);
        showToast("Visitor updated.", 'success');
      } else {
        await addVisitor(visitorData);
        showToast("Visitor registered.", 'success');
      }
    } catch (error) {
      showToast("Failed to save visitor", 'error');
    }
  };

  const handleDeleteVisitor = async (id: number) => {
    if (window.confirm("Delete visitor?")) {
      try {
        const visitorToDelete = visitors.find(v => v.id === id);
        if (visitorToDelete && currentUser) {
          // Move to recycle bin first
          await moveToRecycleBin(
            'Visitor',
            id,
            visitorToDelete,
            currentUser.id,
            'Deleted by user'
          );
        }
        await deleteVisitor(id);
        showToast("Visitor moved to recycle bin.", 'info');
      } catch (error) {
        showToast("Failed to delete visitor", 'error');
      }
    }
  };

  const handleConvertToMember = (visitorId: number) => {
    const visitor = visitors.find(v => v.id === visitorId);
    if (visitor) {
      handleSaveOrUpdateMember({
        name: visitor.name, phone: visitor.phone, email: visitor.email || `${visitor.name.replace(' ', '.')}@hkm.org`,
      } as Partial<Member>);
      handleSaveOrUpdateVisitor({ id: visitor.id, status: 'Converted' });
      showToast(`${visitor.name} converted to Member!`, 'success');
    }
  };

  const handleSaveFollowUp = async (visitorId: number, followUpData: Omit<FollowUp, 'id' | 'visitorId'>) => {
    try {
      await addFollowUp({ visitorId, ...followUpData });
      // Update visitor status and last updated if necessary
      await updateVisitor(visitorId, { status: 'In follow up' });
      showToast("Follow-up recorded.", 'success');
    } catch (error) {
      showToast("Failed to save follow-up", 'error');
    }
  };

  const handleDeleteFollowUp = async (visitorId: number, followUpId: number) => {
    if (window.confirm('Delete follow-up?')) {
      try {
        await deleteFollowUp(followUpId);
        showToast("Follow-up deleted.", 'info');
      } catch (error) {
        showToast("Failed to delete follow-up", 'error');
      }
    }
  };

  // --- UI Helpers ---
  const handleStartEditMember = (member: Member) => { setMemberToEdit(member); setActivePage('Add Member'); };
  const handleStartViewMember = (member: Member) => { setMemberToView(member); setActivePage('Member Details'); };
  const handleStartEditGroup = (group: Group) => { setGroupToEdit(group); };
  const handleEditAttendanceRecord = (date: string, service: string) => { setEditContext({ date, service }); setActivePage('Mark Attendance'); };
  const handleStartEditTransaction = (transaction: Transaction) => { setTransactionToEdit(transaction); setActivePage('Add Transaction'); };
  const handleStartEditEquipment = (item: Equipment) => { setEquipmentToEdit(item); setActivePage('Add Equipment'); };
  const handleStartEditMaintenance = (record: MaintenanceRecord) => { setMaintenanceToEdit(record); setActivePage('Add Maintenance'); };
  const handleStartEditUser = (user: User) => { setUserToEdit(user); setActivePage('Add User'); };
  const handleSaveUser = (userData: Partial<User>) => { onSaveOrUpdateUser(userData); setUserToEdit(null); setActivePage('Users'); showToast("User saved.", 'success'); };

  // Branch Handlers (now using Hasura)
  const handleSaveBranch = async (branchData: Branch) => {
    try {
      if (branchToEdit) {
        await updateBranch(branchToEdit.id, branchData);
      } else {
        await addBranch(branchData);
      }
      showToast(`Branch ${branchToEdit ? 'updated' : 'added'} successfully`, 'success');
      setActivePage('Branches');
      setBranchToEdit(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to save branch', 'error');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      try {
        await deleteBranch(id);
        showToast('Branch deleted successfully', 'success');
      } catch (error: any) {
        showToast(error.message || 'Failed to delete branch', 'error');
      }
    }
  };

  const handleStartEditBranch = (branch: Branch) => { setBranchToEdit(branch); setActivePage('Add Branch'); };
  const handleViewBranch = (branch: Branch) => { setBranchToEdit(branch); setActivePage('Add Branch'); };

  // Recycle Bin Handlers
  const handleRestoreFromRecycleBin = async (item: RecycleBinItem) => {
    try {
      switch (item.type) {
        case 'Member':
          await addMember(item.data);
          break;
        case 'Transaction':
          await addTransaction(item.data);
          break;
        case 'Equipment':
          await addEquipment(item.data);
          break;
        case 'Visitor':
          await addVisitor(item.data);
          break;
        case 'Group':
          await addGroup(item.data);
          break;
        case 'Branch':
          await addBranch(item.data);
          break;
        case 'AttendanceRecord':
          await batchSaveAttendance({ [item.data.memberId]: item.data.status }, item.data.serviceName, item.data.serviceDate);
          break;
        case 'MaintenanceRecord':
          await addMaintenance(item.data);
          break;
        default:
          throw new Error(`Unknown item type: ${item.type}`);
      }
      await removeFromRecycleBin(item.id);
    } catch (error) {
      console.error('Error restoring item:', error);
      throw error;
    }
  };

  const handleEmptyRecycleBin = async () => {
    for (const item of recycleBinItems) {
      await removeFromRecycleBin(item.id);
    }
  };

  const handleReviewPermissionRequest = async (requestId: string, action: 'approve' | 'deny', notes: string) => {
    await updateRequest(requestId, {
      status: action === 'approve' ? 'approved' : 'denied',
      reviewedBy: currentUser?.id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
      expiresAt: action === 'approve' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading Church Data...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardPage setActivePage={setActivePage} members={members} transactions={transactions} onAddTransaction={() => { setTransactionToEdit(null); setActivePage('Add Transaction') }} />;
      case 'Members':
        return <MembersPage setActivePage={setActivePage} members={members} onDeleteMember={handleDeleteMember} onEditMember={handleStartEditMember} onViewMember={handleStartViewMember} />;
      case 'Add Member':
        return <AddMemberPage onBack={() => { setMemberToEdit(null); setActivePage('Members') }} onSave={handleSaveOrUpdateMember} memberToEdit={memberToEdit} />;
      case 'Member Details':
        if (memberToView) {
          return <MemberDetailsPage
            member={memberToView}
            onBack={() => { setMemberToView(null); setActivePage('Members'); }}
            onEdit={handleStartEditMember}
            onDelete={handleDeleteMember}
            transactions={transactions}
            attendanceRecords={attendanceRecords}
          />;
        }
        return <MembersPage setActivePage={setActivePage} members={members} onDeleteMember={handleDeleteMember} onEditMember={handleStartEditMember} onViewMember={handleStartViewMember} />;
      case 'Manage Groups':
        return <GroupsManagementPage onBack={() => setActivePage('Members')} members={members} groups={groups} onSaveGroup={handleSaveOrUpdateGroup} onDeleteGroup={handleDeleteGroup} onEditGroup={handleStartEditGroup} groupToEdit={groupToEdit} setGroupToEdit={setGroupToEdit} />;
      case 'Birthdays':
        return <BirthdaysPage members={members} />;
      case 'Attendance':
        return <AttendanceModule setActivePage={setActivePage} members={members} editContext={editContext} setEditContext={setEditContext} attendanceRecords={attendanceRecords} onEditAttendanceRecord={handleEditAttendanceRecord} onDeleteAttendanceRecord={handleDeleteAttendanceRecord} />;
      case 'Mark Attendance':
        return <MarkAttendancePage onBack={() => { setEditContext(null); setActivePage('Attendance') }} onSave={handleSaveAttendance} editContext={editContext} allAttendanceRecords={attendanceRecords} members={members} />;
      case 'Finance':
        return <FinancePage currentUser={currentUser} transactions={transactions} members={members} onEditTransaction={handleStartEditTransaction} onDeleteTransaction={handleDeleteTransaction} setActivePage={setActivePage} />;
      case 'Add Transaction':
        return <AddTransactionPage onBack={() => { setTransactionToEdit(null); setActivePage('Finance') }} onSave={handleSaveOrUpdateTransaction} transactionToEdit={transactionToEdit} members={members} />;
      case 'SMS Broadcast':
        return <SmsBroadcastPage members={members} groups={groups} smsRecords={smsRecords} onLogSms={addSmsRecord} onDeleteSms={deleteSmsRecord} />;
      case 'Equipment':
        return <EquipmentPage setActivePage={setActivePage} equipment={equipment} onEdit={handleStartEditEquipment} onDelete={handleDeleteEquipment} maintenanceRecords={maintenanceRecords} onEditMaintenance={handleStartEditMaintenance} onDeleteMaintenance={handleDeleteMaintenance} />;
      case 'Add Equipment':
        return <AddEquipmentPage onBack={() => { setEquipmentToEdit(null); setActivePage('Equipment') }} onSave={handleSaveOrUpdateEquipment} equipmentToEdit={equipmentToEdit} />;
      case 'Add Maintenance':
        return <AddMaintenancePage onBack={() => { setMaintenanceToEdit(null); setActivePage('Equipment') }} onSave={handleSaveOrUpdateMaintenance} recordToEdit={maintenanceToEdit} equipment={equipment} />;
      case 'Visitors':
        return <VisitorsModule visitors={visitors} onSaveVisitor={handleSaveOrUpdateVisitor} onUpdateVisitor={handleSaveOrUpdateVisitor} onDeleteVisitor={handleDeleteVisitor} onConvertToMember={handleConvertToMember} onSaveFollowUp={handleSaveFollowUp} onDeleteFollowUp={handleDeleteFollowUp} members={members} />;
      case 'Reports':
        return <ReportsModule members={members} transactions={transactions} attendanceRecords={attendanceRecords} />;
      case 'Users':
        return <UsersPage users={allUsers} setActivePage={setActivePage} onDeleteUser={onDeleteUser} onEditUser={handleStartEditUser} />;
      case 'Add User':
        return <AddUserPage onBack={() => { setUserToEdit(null); setActivePage('Users') }} onSave={handleSaveUser} userToEdit={userToEdit} />;
      case 'Settings':
        return <SettingsPage currentUser={currentUser} />;
      case 'AI Features':
        return <AiFeaturesPage />;
      case 'Branches':
        return <BranchesPage
          branches={branches}
          onAddBranch={() => { setBranchToEdit(null); setActivePage('Add Branch'); }}
          onEditBranch={handleStartEditBranch}
          onDeleteBranch={handleDeleteBranch}
          onViewBranch={handleViewBranch}
          canEdit={currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin'}
        />;
      case 'Add Branch':
        return <AddBranchPage
          onBack={() => { setBranchToEdit(null); setActivePage('Branches'); }}
          onSave={handleSaveBranch}
          branchToEdit={branchToEdit}
        />;
      case 'Data Personnel Management':
        return currentUser ? (
          <DataPersonnelManagementPage
            users={allUsers}
            currentUser={currentUser}
            onUpdateUser={onSaveOrUpdateUser}
            onDeleteUser={onDeleteUser}
          />
        ) : null;
      case 'Recycle Bin':
        return <RecycleBinPage
          currentUser={currentUser!}
          recycleBinItems={recycleBinItems}
          onRestore={handleRestoreFromRecycleBin}
          onPermanentlyDelete={removeFromRecycleBin}
          onEmptyBin={handleEmptyRecycleBin}
        />;
      case 'Permission Requests':
        return <PermissionRequestsPage
          currentUser={currentUser!}
          permissionRequests={permissionRequests}
          onReview={handleReviewPermissionRequest}
        />;
      case 'User Session Monitor':
        return currentUser ? (
          <UserSessionMonitor
            currentUser={currentUser}
          />
        ) : null;
      default:
        return <DashboardPage setActivePage={setActivePage} members={members} transactions={transactions} onAddTransaction={() => { setTransactionToEdit(null); setActivePage('Add Transaction') }} />;
    }
  };

  return (
    <div className={`flex h-screen ${modeColors.bg} ${modeColors.text}`}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden pt-20">
        <Header activePage={activePage} user={currentUser} onLogout={onLogout} onNavigate={setActivePage} />
        <QuickNav activePage={activePage} onNavigate={setActivePage} />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${modeColors.bgSecondary} p-6`}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
