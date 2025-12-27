
import React, { useState } from 'react';
import { ArrowLeftIcon, UserPlusIcon, UsersIcon, PencilIcon, TrashIcon } from './Icons';
import AddGroupPage from './AddGroupPage';
import { Member } from './memberData';
import ActionButtons from './ActionButtons';

export interface Group {
    id: number;
    name: string;
    leader: string;
    members: number;
    created: string;
}

interface GroupsManagementPageProps {
    onBack: () => void;
    members: Member[];
    groups: Group[];
    onSaveGroup: (groupData: Partial<Group>) => void;
    onDeleteGroup: (id: number) => void;
    onEditGroup: (group: Group) => void;
    groupToEdit: Group | null;
    setGroupToEdit: (group: Group | null) => void;
}

const GroupsManagementPage: React.FC<GroupsManagementPageProps> = ({ onBack, members, groups, onSaveGroup, onDeleteGroup, onEditGroup, groupToEdit, setGroupToEdit }) => {
    const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);

    const handleSaveGroupAndClose = (groupData: Partial<Group>) => {
        onSaveGroup(groupData);
        setIsAddingOrEditing(false);
        setGroupToEdit(null);
    };

    const handleAddNew = () => {
        setGroupToEdit(null);
        setIsAddingOrEditing(true);
    };

    const handleEdit = (group: Group) => {
        setGroupToEdit(group);
        setIsAddingOrEditing(true);
    };

    if (isAddingOrEditing) {
        return <AddGroupPage onBack={() => { setIsAddingOrEditing(false); setGroupToEdit(null); }} members={members} onSave={handleSaveGroupAndClose} groupToEdit={groupToEdit} />;
    }

    const getLeaderName = (leaderEmail: string) => {
        const leader = members.find(m => m.email === leaderEmail);
        return leader ? leader.name : leaderEmail;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Groups Management</h1>
                <button onClick={onBack} className="flex items-center text-sm text-green-600 hover:underline font-semibold">
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Back to Members
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                 <div className="flex justify-between items-center pb-4 mb-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <UsersIcon className="h-5 w-5 mr-2 text-gray-500" />
                        All Church Groups
                    </h3>
                    <button onClick={handleAddNew} className="bg-church-green-dark hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center">
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        Add New Group
                    </button>
                </div>

                <div className="overflow-auto max-h-[65vh]">
                    <table className="w-full text-sm text-left text-gray-600 relative">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Group Name</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Leader</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">No. of Members</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Date Created</th>
                                <th scope="col" className="px-6 py-3 bg-gray-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group) => (
                                <tr key={group.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{group.name}</td>
                                    <td className="px-6 py-4 capitalize">{getLeaderName(group.leader)}</td>
                                    <td className="px-6 py-4 text-center">{group.members}</td>
                                    <td className="px-6 py-4">{group.created}</td>
                                    <td className="px-6 py-4">
                                        <ActionButtons
                                            onEdit={() => handleEdit(group)}
                                            onDelete={() => onDeleteGroup(group.id)}
                                            itemName={group.name}
                                            itemType="Group"
                                            itemDetails={{
                                                'Leader': getLeaderName(group.leader),
                                                'Members': group.members.toString(),
                                                'Created': group.created
                                            }}
                                            size="sm"
                                            variant="icon"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GroupsManagementPage;
