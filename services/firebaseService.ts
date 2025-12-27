import {
    collection, getDocs, doc, setDoc, deleteDoc, updateDoc,
    query, orderBy, writeBatch, onSnapshot, Unsubscribe, getDoc
} from "firebase/firestore";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    signInWithPopup,
    onAuthStateChanged,
    User as FirebaseUser
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebaseConfig";
import { Member } from "../components/memberData";
import { Transaction } from "../components/financeData";
import { AttendanceRecord } from "../components/attendanceData";
import { Equipment } from "../components/equipmentData";
import { MaintenanceRecord } from "../components/maintenanceData";
import { Visitor } from "../components/visitorData";
import { Group } from "../components/GroupsManagementPage";
import { User, RecycleBinItem } from "../components/userData";
import { SmsRecord } from "../components/smsData";
import { Branch } from "../components/branchData";
import { PermissionRequest } from "../components/PermissionRequest";
import { UserSession, LoginAttempt } from "../components/userSessionData";
import { where } from "firebase/firestore";

export const fbService = {
    auth: {
        login: async (email: string, pass: string) => {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                return userCredential.user;
            } catch (error: any) {
                // Suppress console error for invalid credentials as it's a user error, handled in UI
                if (error.code !== 'auth/invalid-credential' && error.code !== 'auth/user-not-found' && error.code !== 'auth/wrong-password') {
                    console.error("Firebase Login Error:", error.code, error.message);
                }
                throw error;
            }
        },
        register: async (email: string, pass: string, avatar?: string) => {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);

                // SAFETY CHECK: Prevent crash from large Base64 strings in Auth Profile
                let photoURL = avatar;
                if (avatar && avatar.length > 2000) {
                    photoURL = `https://ui-avatars.com/api/?name=${email}`;
                }

                if (photoURL) {
                    await updateProfile(userCredential.user, { photoURL: photoURL });
                }

                // Attempt to send verification, but don't crash if it fails (e.g. rate limit)
                try {
                    await sendEmailVerification(userCredential.user);
                } catch (verifyError) {
                    console.warn("Verification email could not be sent:", verifyError);
                }

                return userCredential.user;
            } catch (error: any) {
                if (error.code !== 'auth/email-already-in-use') {
                    console.error("Firebase Register Error:", error.code, error.message);
                }
                throw error;
            }
        },
        resetPassword: async (email: string) => {
            try {
                await sendPasswordResetEmail(auth, email);
            } catch (error: any) {
                console.error("Password Reset Error:", error.code, error.message);
                throw error;
            }
        },
        logout: async () => {
            await signOut(auth);
        },
        sendVerification: async (user: FirebaseUser) => {
            await sendEmailVerification(user);
        },
        getCurrentUser: () => {
            return auth.currentUser;
        },
        googleSignIn: async () => {
            try {
                // Ensure auth and googleProvider are initialized
                if (!auth) {
                    throw new Error('Firebase auth is not initialized');
                }
                if (!googleProvider) {
                    throw new Error('Google provider is not initialized');
                }

                console.log('Starting Google Sign-In flow...');
                const result = await signInWithPopup(auth, googleProvider);
                console.log('Google Sign-In successful:', result.user.email);
                return result.user;
            } catch (error: any) {
                console.error("Google Sign-In detailed error:", {
                    code: error.code,
                    message: error.message,
                    error: error
                });

                // Provide user-friendly error messages
                if (error.code === 'auth/popup-closed-by-user') {
                    throw new Error('Sign-in was cancelled.');
                } else if (error.code === 'auth/popup-blocked') {
                    throw new Error('Pop-up was blocked. Please allow pop-ups for this site.');
                } else if (error.code === 'auth/operation-not-allowed') {
                    throw new Error('Google Sign-In is not enabled. Please contact support.');
                } else if (error.code === 'auth/internal-error') {
                    throw new Error('Firebase configuration error. Please refresh and try again.');
                } else {
                    throw error;
                }
            }
        },
        onAuthStateChanged: (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
            return onAuthStateChanged(auth, callback);
        }
    },

    members: {
        getAll: async (): Promise<Member[]> => {
            const q = query(collection(db, "members"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as Member);
        },
        subscribe: (callback: (members: Member[]) => void): Unsubscribe => {
            const q = query(collection(db, "members"));
            return onSnapshot(q, (snapshot) => {
                const members = snapshot.docs.map(doc => doc.data() as Member);
                callback(members);
            });
        },
        add: async (member: Member) => {
            await setDoc(doc(db, "members", member.id), member);
        },
        update: async (id: string, data: Partial<Member>) => {
            await updateDoc(doc(db, "members", id), data);
        },
        delete: async (id: string) => {
            await deleteDoc(doc(db, "members", id));
        }
    },

    finance: {
        getAll: async (): Promise<Transaction[]> => {
            const q = query(collection(db, "transactions"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as Transaction);
        },
        subscribe: (callback: (transactions: Transaction[]) => void): Unsubscribe => {
            const q = query(collection(db, "transactions"), orderBy("date", "desc"));
            return onSnapshot(q, (snapshot) => {
                const transactions = snapshot.docs.map(doc => doc.data() as Transaction);
                callback(transactions);
            });
        },
        add: async (transaction: Transaction) => {
            await setDoc(doc(db, "transactions", transaction.id.toString()), transaction);
        },
        update: async (transaction: Transaction) => {
            await setDoc(doc(db, "transactions", transaction.id.toString()), transaction);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "transactions", id.toString()));
        }
    },

    attendance: {
        getAll: async (): Promise<AttendanceRecord[]> => {
            const q = query(collection(db, "attendance"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as AttendanceRecord);
        },
        subscribe: (callback: (records: AttendanceRecord[]) => void): Unsubscribe => {
            const q = query(collection(db, "attendance"), orderBy("date", "desc"));
            return onSnapshot(q, (snapshot) => {
                const records = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
                callback(records);
            });
        },
        batchSave: async (records: AttendanceRecord[]) => {
            const batch = writeBatch(db);
            records.forEach(record => {
                const ref = doc(db, "attendance", record.id.toString());
                batch.set(ref, record);
            });
            await batch.commit();
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "attendance", id.toString()));
        }
    },

    groups: {
        getAll: async (): Promise<Group[]> => {
            const snapshot = await getDocs(collection(db, "groups"));
            return snapshot.docs.map(doc => doc.data() as Group);
        },
        subscribe: (callback: (groups: Group[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "groups"), (snapshot) => {
                const groups = snapshot.docs.map(doc => doc.data() as Group);
                callback(groups);
            });
        },
        save: async (group: Group) => {
            await setDoc(doc(db, "groups", group.id.toString()), group);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "groups", id.toString()));
        }
    },

    equipment: {
        getAll: async (): Promise<Equipment[]> => {
            const snapshot = await getDocs(collection(db, "equipment"));
            return snapshot.docs.map(doc => doc.data() as Equipment);
        },
        subscribe: (callback: (equipment: Equipment[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "equipment"), (snapshot) => {
                const equipment = snapshot.docs.map(doc => doc.data() as Equipment);
                callback(equipment);
            });
        },
        save: async (item: Equipment) => {
            await setDoc(doc(db, "equipment", item.id.toString()), item);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "equipment", id.toString()));
        }
    },

    maintenance: {
        getAll: async (): Promise<MaintenanceRecord[]> => {
            const snapshot = await getDocs(collection(db, "maintenance"));
            return snapshot.docs.map(doc => doc.data() as MaintenanceRecord);
        },
        subscribe: (callback: (records: MaintenanceRecord[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "maintenance"), (snapshot) => {
                const records = snapshot.docs.map(doc => doc.data() as MaintenanceRecord);
                callback(records);
            });
        },
        save: async (record: MaintenanceRecord) => {
            await setDoc(doc(db, "maintenance", record.id.toString()), record);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "maintenance", id.toString()));
        }
    },

    visitors: {
        getAll: async (): Promise<Visitor[]> => {
            const snapshot = await getDocs(collection(db, "visitors"));
            return snapshot.docs.map(doc => doc.data() as Visitor);
        },
        subscribe: (callback: (visitors: Visitor[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "visitors"), (snapshot) => {
                const visitors = snapshot.docs.map(doc => doc.data() as Visitor);
                callback(visitors);
            });
        },
        save: async (visitor: Visitor) => {
            await setDoc(doc(db, "visitors", visitor.id.toString()), visitor);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "visitors", id.toString()));
        }
    },

    sms: {
        getAll: async (): Promise<SmsRecord[]> => {
            const q = query(collection(db, "sms"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as SmsRecord);
        },
        subscribe: (callback: (records: SmsRecord[]) => void): Unsubscribe => {
            const q = query(collection(db, "sms"), orderBy("date", "desc"));
            return onSnapshot(q, (snapshot) => {
                const records = snapshot.docs.map(doc => doc.data() as SmsRecord);
                callback(records);
            });
        },
        save: async (record: SmsRecord) => {
            await setDoc(doc(db, "sms", record.id.toString()), record);
        }
    },

    users: {
        getAll: async (): Promise<User[]> => {
            const snapshot = await getDocs(collection(db, "users"));
            return snapshot.docs.map(doc => doc.data() as User);
        },
        get: async (id: string): Promise<User | null> => {
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data() as User) : null;
        },
        createDefault: async (id: string, email: string): Promise<User> => {
            const newUser: User = {
                id: id,
                username: email.split('@')[0],
                email: email,
                role: 'Guest',
                permissionLevel: 'Viewer',
                passwordHash: 'MANAGED_BY_FIREBASE',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}`,
                lastLogin: new Date().toISOString(),
                assignedSections: [],
                isActive: false,
                createdBy: 'system',
                lastPasswordChange: Date.now()
            };
            await setDoc(doc(db, "users", id), newUser);
            return newUser;
        },
        subscribe: (callback: (users: User[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "users"), (snapshot) => {
                const users = snapshot.docs.map(doc => doc.data() as User);
                callback(users);
            });
        },
        save: async (user: User) => {
            await setDoc(doc(db, "users", user.id.toString()), user);
        },
        delete: async (id: number) => {
            await deleteDoc(doc(db, "users", id.toString()));
        }
    },

    branches: {
        getAll: async (): Promise<Branch[]> => {
            const snapshot = await getDocs(collection(db, "branches"));
            return snapshot.docs.map(doc => doc.data() as Branch);
        },
        subscribe: (callback: (branches: Branch[]) => void): Unsubscribe => {
            return onSnapshot(collection(db, "branches"), (snapshot) => {
                const branches = snapshot.docs.map(doc => doc.data() as Branch);
                callback(branches);
            });
        },
        save: async (branch: Branch) => {
            await setDoc(doc(db, "branches", branch.id.toString()), branch);
        },
        delete: async (id: string) => {
            await deleteDoc(doc(db, "branches", id));
        }
    },

    recycleBin: {
        getAll: async (): Promise<RecycleBinItem[]> => {
            const q = query(collection(db, "recycleBin"), orderBy("deletedAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as RecycleBinItem);
        },
        subscribe: (callback: (items: RecycleBinItem[]) => void): Unsubscribe => {
            const q = query(collection(db, "recycleBin"), orderBy("deletedAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => doc.data() as RecycleBinItem);
                callback(items);
            });
        },
        add: async (item: RecycleBinItem) => {
            await setDoc(doc(db, "recycleBin", item.id), item);
        },
        delete: async (id: string) => {
            await deleteDoc(doc(db, "recycleBin", id));
        },
        // Helper function to move item to recycle bin
        moveToRecycleBin: async (
            type: RecycleBinItem['type'],
            originalId: string | number,
            data: any,
            deletedBy: string,
            reason?: string
        ) => {
            const recycleBinItem: RecycleBinItem = {
                id: `${type}_${originalId}_${Date.now()}`,
                originalId,
                type,
                data,
                deletedBy,
                deletedAt: new Date().toISOString(),
                reason
            };
            await fbService.recycleBin.add(recycleBinItem);
            return recycleBinItem;
        }
    },

    permissionRequests: {
        getAll: async (): Promise<PermissionRequest[]> => {
            const q = query(collection(db, "permissionRequests"), orderBy("requestedAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as PermissionRequest);
        },
        subscribe: (callback: (requests: PermissionRequest[]) => void): Unsubscribe => {
            const q = query(collection(db, "permissionRequests"), orderBy("requestedAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                const requests = snapshot.docs.map(doc => doc.data() as PermissionRequest);
                callback(requests);
            });
        },
        add: async (request: PermissionRequest) => {
            await setDoc(doc(db, "permissionRequests", request.id), request);
        },
        update: async (request: PermissionRequest) => {
            await setDoc(doc(db, "permissionRequests", request.id), request);
        },
        delete: async (id: string) => {
            await deleteDoc(doc(db, "permissionRequests", id));
        },
        // Helper function to create permission request
        createRequest: async (
            requesterId: string,
            requesterName: string,
            requesterEmail: string,
            requestType: 'edit' | 'delete',
            dataType: PermissionRequest['dataType'],
            dataId: string | number,
            dataName: string,
            reason: string
        ): Promise<PermissionRequest> => {
            const request: PermissionRequest = {
                id: `${requestType}_${dataType}_${dataId}_${Date.now()}`,
                requesterId,
                requesterName,
                requesterEmail,
                requestType,
                dataType,
                dataId,
                dataName,
                reason,
                requestedAt: new Date().toISOString(),
                status: 'pending'
            };
            await fbService.permissionRequests.add(request);
            return request;
        },
        // Check if user has active permission for specific data
        hasActivePermission: async (
            userId: string,
            dataType: PermissionRequest['dataType'],
            dataId: string | number,
            requestType: 'edit' | 'delete'
        ): Promise<boolean> => {
            const requests = await fbService.permissionRequests.getAll();
            const activeRequest = requests.find(r =>
                r.requesterId === userId &&
                r.dataType === dataType &&
                r.dataId === dataId &&
                r.requestType === requestType &&
                r.status === 'approved' &&
                r.expiresAt &&
                new Date(r.expiresAt) > new Date()
            );
            return !!activeRequest;
        }
    },

    // User Sessions Management
    userSessions: {
        getAll: async (): Promise<UserSession[]> => {
            const q = query(collection(db, "userSessions"), orderBy("loginTime", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as UserSession);
        },
        subscribe: (callback: (sessions: UserSession[]) => void): Unsubscribe => {
            const q = query(collection(db, "userSessions"), orderBy("loginTime", "desc"));
            return onSnapshot(q, (snapshot) => {
                const sessions = snapshot.docs.map(doc => doc.data() as UserSession);
                callback(sessions);
            });
        },
        add: async (session: UserSession) => {
            await setDoc(doc(db, "userSessions", session.id), session);
        },
        update: async (session: UserSession) => {
            await setDoc(doc(db, "userSessions", session.id), session);
        },
        endSession: async (sessionId: string) => {
            const sessionRef = doc(db, "userSessions", sessionId);
            await updateDoc(sessionRef, {
                logoutTime: new Date().toISOString(),
                isActive: false
            });
        },
        getActiveSessions: async (): Promise<UserSession[]> => {
            const q = query(
                collection(db, "userSessions"),
                where("isActive", "==", true),
                orderBy("lastActivity", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as UserSession);
        }
    },

    // Login Attempts Tracking
    loginAttempts: {
        getAll: async (): Promise<LoginAttempt[]> => {
            const q = query(collection(db, "loginAttempts"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as LoginAttempt);
        },
        subscribe: (callback: (attempts: LoginAttempt[]) => void): Unsubscribe => {
            const q = query(collection(db, "loginAttempts"), orderBy("timestamp", "desc"));
            return onSnapshot(q, (snapshot) => {
                const attempts = snapshot.docs.map(doc => doc.data() as LoginAttempt);
                callback(attempts);
            });
        },
        add: async (attempt: LoginAttempt) => {
            await setDoc(doc(db, "loginAttempts", attempt.id), attempt);
        },
        getRecentAttempts: async (hours: number = 24): Promise<LoginAttempt[]> => {
            const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
            const q = query(
                collection(db, "loginAttempts"),
                where("timestamp", ">=", cutoffTime),
                orderBy("timestamp", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as LoginAttempt);
        }
    }
};
