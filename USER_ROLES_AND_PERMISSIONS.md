# User Roles & Permissions Guide

## Overview
The system now has 4 user roles with different access levels and permissions.

## User Roles

### 1. **Super Admin** 👑
- **Full System Access**: Can access all pages and features
- **User Management**: Can create, edit, and delete all users
- **Data Personnel Management**: Can assign sections to Data Personnel
- **Visible Pages**: 
  - Dashboard, Members, Birthdays, Attendance, Finance, Equipment, SMS Broadcast, Visitors, Branches
  - **Reports** (Admin only)
  - **Users** (Super Admin only) ⭐
  - **Data Personnel Management** (Super Admin only) ⭐
  - Settings, AI Features

**Exclusive Function**: Only Super Admin can:
- See and manage ALL registered users
- Assign sections to Data Personnel
- Create other Super Admins, Admins, Members, and Data Personnel

---

### 2. **Admin** 🔧
- **Full Feature Access**: Can access all data management pages
- **Data Editing**: Can create, edit, and delete members, attendance, finance records, etc.
- **Cannot Manage Users**: Cannot access Users panel
- **Visible Pages**:
  - Dashboard, Members, Birthdays, Attendance, Finance, Equipment, SMS Broadcast, Visitors, Branches
  - **Reports** (Admin only)
  - **AI Features**
  - Settings

---

### 3. **Member** 👥
- **General Access**: Can view and edit basic system data
- **Default Sections**: Has access to all basic sections (doesn't need assignment)
- **Visible Pages**:
  - Dashboard, Members, Birthdays, Attendance, Finance, Equipment, SMS Broadcast, Visitors, Branches
  - Settings

**Use Case**: Church staff members who need general system access

---

### 4. **Data Personnel** 📊 (Clerk Personnel)
- **Limited Access**: Can ONLY access sections assigned by Super Admin
- **Assigned Sections**: Must be assigned one or more of these sections:
  - Members
  - Attendance
  - Finance
  - Equipment
  - Visitors
  - Branches
  - SMS Broadcast
- **Default**: No access until Super Admin assigns sections
- **Visible Pages**: Only assigned sections + Dashboard & Settings

**Use Case**: Data entry clerks, temporary staff, or section-specific helpers

---

## Key Features

### Assigning Sections to Data Personnel
1. Go to **Users** page (Super Admin only)
2. Click the **Edit** button on a Data Personnel
3. In the "Assigned Sections" panel, select ALL the sections the Data Personnel should access
4. Click **Save**

### Creating Data Personnel with Specific Access
1. Click **Add New User**
2. Set Role to **Data Personnel**
3. In "Assigned Sections", select the specific sections they need
4. Click **Save**

### Promoting/Demoting Users
1. Go to **Users** page
2. Edit the user
3. Change their Role (Super Admin → Admin, Member → Data Personnel, etc.)
4. Save changes

---

## Permission Matrix

| Feature | Super Admin | Admin | Member | Data Personnel |
|---------|:-----------:|:-----:|:------:|:--------------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Members | ✅ | ✅ | ✅ | 🔒 |
| Attendance | ✅ | ✅ | ✅ | 🔒 |
| Finance | ✅ | ✅ | ✅ | 🔒 |
| Equipment | ✅ | ✅ | ✅ | 🔒 |
| SMS Broadcast | ✅ | ✅ | ✅ | 🔒 |
| Visitors | ✅ | ✅ | ✅ | 🔒 |
| Branches | ✅ | ✅ | ✅ | 🔒 |
| Reports | ✅ | ✅ | ❌ | ❌ |
| **Users** | ✅ | ❌ | ❌ | ❌ |
| **Data Personnel Management** | ✅ | ❌ | ❌ | ❌ |
| AI Features | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |

✅ = Full Access  
🔒 = Only if assigned  
❌ = No Access

---

## Security Notes

1. **Super Admin Responsibility**: Only Super Admin should be used by you for system administration
2. **Google Sign-In Users**: New users from Google Sign-In are created as Data Personnel by default (or Admin if they're the first user)
3. **Section Assignment**: Data Personnel cannot access any section until Super Admin explicitly assigns them
4. **Role Hierarchy**: Super Admin can manage all other roles

---

## Best Practices

1. **Create Super Admins carefully** - They have complete system access
2. **Use Members for staff** - Staff with general system access needs
3. **Use Data Personnel for clerks** - Data entry clerks or section-specific assistants
4. **Review regularly** - Check the Users page monthly to manage access
5. **Update Data Personnel access** - When clerks finish helping, remove their assignments or change role to Member
