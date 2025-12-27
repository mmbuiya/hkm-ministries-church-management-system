# 🔐 Permission Request System Documentation

## Overview

The Permission Request System adds an extra layer of security by requiring **Editor** users to request approval from **Super Admin** before editing existing data. This ensures complete control over data modifications while maintaining audit trails.

## 🎯 How It Works

### **User Roles & Permissions:**

| Role | New Data | Edit Existing Data | Delete Data |
|------|----------|-------------------|-------------|
| **Super Admin** | ✅ Direct | ✅ Direct | ✅ Direct |
| **Admin** | ✅ Direct | ✅ Direct | ✅ Direct |
| **Data Personnel (Editor)** | ✅ Direct | 🔒 **Needs Approval** | 🔒 **Needs Approval** |
| **Member (Editor)** | ✅ Direct | 🔒 **Needs Approval** | 🔒 **Needs Approval** |
| **Viewer** | ❌ Blocked | ❌ Blocked | ❌ Blocked |

### **Permission Request Flow:**

1. **Editor** tries to edit existing data
2. System shows **"Request Permission"** dialog
3. **Editor** provides reason for edit
4. **Request sent** to Super Admin
5. **Super Admin** reviews and approves/denies
6. **Editor** gets notified of decision
7. **Approved permissions** are valid for 24 hours

## 🛠️ Implementation Guide

### **1. Using the EditButtonWithPermission Component**

Replace regular edit buttons with the permission-aware component:

```tsx
import EditButtonWithPermission from './EditButtonWithPermission';

// In your component:
<EditButtonWithPermission
    currentUser={currentUser}
    dataType="Member"
    dataId={member.id}
    dataName={member.name}
    onEdit={() => handleEditMember(member)}
    requestType="edit"
>
    Edit Member
</EditButtonWithPermission>
```

### **2. Using the usePermissionRequest Hook**

For custom implementations:

```tsx
import { usePermissionRequest } from '../hooks/usePermissionRequest';

const MyComponent = ({ currentUser }) => {
    const {
        showRequestModal,
        pendingRequest,
        canEditDirectly,
        handleEditAction,
        submitPermissionRequest,
        cancelPermissionRequest
    } = usePermissionRequest(currentUser);

    const handleEdit = () => {
        handleEditAction(
            'Member',           // dataType
            member.id,          // dataId
            member.name,        // dataName
            () => editMember(), // actual edit function
            'edit'              // requestType
        );
    };

    return (
        <>
            <button onClick={handleEdit}>
                {canEditDirectly ? 'Edit' : 'Request Edit'}
            </button>

            {/* Permission Request Modal */}
            {showRequestModal && pendingRequest && (
                <PermissionRequestModal
                    isOpen={showRequestModal}
                    onClose={cancelPermissionRequest}
                    onSubmit={submitPermissionRequest}
                    dataType={pendingRequest.dataType}
                    dataName={pendingRequest.dataName}
                    requestType={pendingRequest.requestType}
                    currentUser={currentUser}
                />
            )}
        </>
    );
};
```

### **3. Manual Permission Checking**

```tsx
import { needsPermissionRequest } from './userData';
import { fbService } from '../services/firebaseService';

// Check if user needs permission request
if (needsPermissionRequest(currentUser)) {
    // Show request dialog or check for existing permission
    const hasPermission = await fbService.permissionRequests.hasActivePermission(
        currentUser.id,
        'Member',
        memberId,
        'edit'
    );
    
    if (!hasPermission) {
        // Request permission
        await fbService.permissionRequests.createRequest(
            currentUser.id,
            currentUser.username,
            currentUser.email,
            'edit',
            'Member',
            memberId,
            memberName,
            reason
        );
    }
}
```

## 🔧 Super Admin Management

### **Accessing Permission Requests:**

1. Login as Super Admin
2. Navigate to **"Permission Requests"** in sidebar
3. Review pending requests
4. Approve or deny with notes

### **Permission Request Details:**

Each request shows:
- **Requester Information** (name, email, role)
- **Request Type** (edit/delete)
- **Data Type & Name** (what they want to modify)
- **Reason** (why they need to modify it)
- **Request Time** (when submitted)

### **Approval Process:**

1. **Review Request** - Click eye icon to see details
2. **Approve** - Click green checkmark
   - Add optional approval notes
   - Grants 24-hour access
3. **Deny** - Click red X
   - Must provide denial reason
   - User is notified

## 📊 System Features

### **Automatic Expiration:**
- Approved permissions expire after **24 hours**
- Users must request again for additional edits
- Prevents indefinite access

### **Audit Trail:**
- All requests logged with timestamps
- Tracks who approved/denied requests
- Maintains complete history

### **Real-Time Notifications:**
- Users notified when requests are reviewed
- Status updates in real-time
- Clear approval/denial messages

### **Smart Permission Checking:**
- System checks for active permissions before showing request dialog
- Prevents duplicate requests
- Seamless user experience

## 🎯 Configuration Options

### **Permission Duration:**
Change approval duration in `firebaseService.ts`:

```typescript
// Current: 24 hours
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

// Custom: 8 hours
expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
```

### **User Role Requirements:**
Modify `needsPermissionRequest()` in `userData.ts`:

```typescript
export function needsPermissionRequest(user: User | null): boolean {
    if (!user) return true;
    
    // Super Admin and Admin never need permission requests
    if (user.role === 'Super Admin' || user.role === 'Admin') return false;
    
    // Customize which roles need approval
    return user.role === 'Data Personnel' || user.role === 'Member';
}
```

## 🔒 Security Benefits

### **Complete Control:**
- Super Admin approves ALL data modifications
- No unauthorized changes possible
- Clear audit trail for compliance

### **Granular Permissions:**
- Per-item permission requests
- Time-limited access
- Specific action approval (edit vs delete)

### **User Accountability:**
- Users must provide reasons
- All actions tracked
- Transparent approval process

## 📝 Best Practices

### **For Super Admins:**
1. **Review requests promptly** - Users are waiting for approval
2. **Provide clear denial reasons** - Help users understand requirements
3. **Monitor request patterns** - Identify training needs
4. **Regular permission audits** - Check for expired permissions

### **For Developers:**
1. **Use EditButtonWithPermission** for consistent UX
2. **Check permissions before actions** - Prevent errors
3. **Handle loading states** - Show request status
4. **Provide clear feedback** - Users need to know what's happening

### **For Users:**
1. **Provide detailed reasons** - Helps Super Admin make decisions
2. **Plan edit sessions** - Permissions expire in 24 hours
3. **Request in advance** - Allow time for approval
4. **Follow up if needed** - Contact Super Admin for urgent requests

## 🚀 Integration Examples

### **Member Edit Button:**
```tsx
<EditButtonWithPermission
    currentUser={currentUser}
    dataType="Member"
    dataId={member.id}
    dataName={member.name}
    onEdit={() => setMemberToEdit(member)}
    className="text-sm"
>
    <PencilIcon className="w-4 h-4" />
</EditButtonWithPermission>
```

### **Transaction Delete Button:**
```tsx
<EditButtonWithPermission
    currentUser={currentUser}
    dataType="Transaction"
    dataId={transaction.id}
    dataName={`${transaction.type} - $${transaction.amount}`}
    onEdit={() => handleDeleteTransaction(transaction.id)}
    requestType="delete"
    className="text-red-600 hover:text-red-800"
>
    Delete
</EditButtonWithPermission>
```

### **Equipment Maintenance:**
```tsx
<EditButtonWithPermission
    currentUser={currentUser}
    dataType="Equipment"
    dataId={equipment.id}
    dataName={equipment.name}
    onEdit={() => setEquipmentToEdit(equipment)}
>
    Update Equipment
</EditButtonWithPermission>
```

## 📈 Monitoring & Analytics

The system provides insights through:
- **Request volume** - How many requests per day/week
- **Approval rates** - Percentage of approved vs denied
- **User patterns** - Which users request most often
- **Data types** - What data is edited most frequently
- **Response times** - How quickly requests are reviewed

This helps optimize workflows and identify training opportunities.

---

## 🎯 Summary

The Permission Request System provides:
✅ **Complete data control** for Super Admin
✅ **Audit trail** for all modifications  
✅ **User-friendly** request process
✅ **Time-limited** permissions
✅ **Real-time** notifications
✅ **Flexible** configuration options

Your church data is now protected by a comprehensive approval workflow that ensures only authorized changes are made while maintaining transparency and accountability.