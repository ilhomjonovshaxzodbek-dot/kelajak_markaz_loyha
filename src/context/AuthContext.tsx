import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';

export type UserRole = 'admin' | 'administrator' | 'teacher' | 'student';

export interface ManagedUserRecord {
  uid: string;
  displayName: string;
  role: UserRole;
  email?: string;
}

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  displayName: string;
  authReady: boolean;
  managedUsers: ManagedUserRecord[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  assignUserRole: (targetUid: string, nextRole: UserRole) => Promise<void>;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'ilhomjonovshaxzodbek@gmail.com';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [displayName, setDisplayName] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUserRecord[]>([]);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubUsersList: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (unsubUsersList) {
        unsubUsersList();
        unsubUsersList = null;
      }

      setUser(firebaseUser);
      if (!firebaseUser) {
        setRole('student');
        setDisplayName('');
        setManagedUsers([]);
        setAuthReady(true);
        return;
      }

      const isBootstrappedAdmin =
        firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL &&
        firebaseUser.emailVerified;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const privateRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
      const roleRef = doc(db, 'staff_roles', firebaseUser.uid);

      try {
        const snap = await getDoc(userRef);
        const fallbackName =
          firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Foydalanuvchi';

        if (!snap.exists()) {
          const initialRole: UserRole = isBootstrappedAdmin ? 'admin' : 'student';
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: fallbackName.slice(0, 120),
            role: initialRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await setDoc(privateRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'no-email@kelajak.uz',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          if (isBootstrappedAdmin) {
            await setDoc(roleRef, {
              uid: firebaseUser.uid,
              role: 'admin',
              assignedBy: firebaseUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } else if (isBootstrappedAdmin && snap.data().role !== 'admin') {
          await updateDoc(userRef, {
            role: 'admin',
            updatedAt: serverTimestamp(),
          });
          await setDoc(roleRef, {
            uid: firebaseUser.uid,
            role: 'admin',
            assignedBy: firebaseUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error('User profile bootstrap error:', err);
      }

      // Listen to own user document and staff_roles document
      unsubUserDoc = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const resolvedRole: UserRole = isBootstrappedAdmin
              ? 'admin'
              : ((data.role as UserRole) || 'student');
            setRole(resolvedRole);
            setDisplayName(
              (data.displayName as string) ||
                firebaseUser.displayName ||
                firebaseUser.email ||
                'Foydalanuvchi'
            );

            // If admin or administrator, subscribe to users list
            if (resolvedRole === 'admin' || resolvedRole === 'administrator') {
              if (!unsubUsersList) {
                unsubUsersList = onSnapshot(
                  collection(db, 'users'),
                  async (querySnap) => {
                    const baseUsers: ManagedUserRecord[] = [];
                    querySnap.forEach((d) => {
                      const ud = d.data();
                      baseUsers.push({
                        uid: ud.uid as string,
                        displayName: (ud.displayName as string) || 'Foydalanuvchi',
                        role: (ud.role as UserRole) || 'student',
                      });
                    });

                    const enriched = await Promise.all(
                      baseUsers.map(async (item) => {
                        try {
                          const privSnap = await getDoc(
                            doc(db, 'users', item.uid, 'private', 'info')
                          );
                          if (privSnap.exists()) {
                            return {
                              ...item,
                              email: (privSnap.data().email as string) || undefined,
                            };
                          }
                        } catch (privErr) {
                          console.warn('Could not read private email for user:', item.uid, privErr);
                        }
                        return item;
                      })
                    );

                    setManagedUsers(enriched);
                  },
                  (err) => {
                    handleFirestoreError(err, OperationType.LIST, 'users');
                  }
                );
              }
            } else {
              if (unsubUsersList) {
                unsubUsersList();
                unsubUsersList = null;
              }
              setManagedUsers([]);
            }
          } else {
            setRole(isBootstrappedAdmin ? 'admin' : 'student');
            setDisplayName(firebaseUser.displayName || firebaseUser.email || 'Foydalanuvchi');
          }
          setAuthReady(true);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubUsersList) unsubUsersList();
    };
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(cred.user, { displayName: fullName.trim() });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const assignUserRole = async (targetUid: string, nextRole: UserRole) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const targetUserRef = doc(db, 'users', targetUid);
    const targetRoleRef = doc(db, 'staff_roles', targetUid);

    try {
      await updateDoc(targetUserRef, {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }

    try {
      const existingRoleSnap = await getDoc(targetRoleRef);
      if (existingRoleSnap.exists()) {
        await updateDoc(targetRoleRef, {
          role: nextRole,
          assignedBy: currentUid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(targetRoleRef, {
          uid: targetUid,
          role: nextRole,
          assignedBy: currentUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `staff_roles/${targetUid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        displayName,
        authReady,
        managedUsers,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        assignUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
