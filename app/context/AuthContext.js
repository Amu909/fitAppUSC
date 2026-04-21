import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseconfig';

const BOOTSTRAP_ADMIN_EMAIL = 'admin@fitapp.com';
const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const AuthContext = createContext({
  isLoggedIn: false,
  authLoading: true,
  currentUser: null,
  userProfile: null,
  userRole: 'member',
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('member');

  const syncUserProfile = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snapshot = await getDoc(userRef);
    const isBootstrapAdmin = normalizeEmail(firebaseUser.email) === BOOTSTRAP_ADMIN_EMAIL;

    if (!snapshot.exists()) {
      const defaultProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: 'member',
        active: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, defaultProfile);
      setUserProfile({
        ...defaultProfile,
        role: isBootstrapAdmin ? 'admin' : 'member',
      });
      setUserRole(isBootstrapAdmin ? 'admin' : 'member');
      return;
    }

    const profileData = snapshot.data();
    const profileEmail = normalizeEmail(profileData.email);
    const resolvedRole =
      isBootstrapAdmin || profileEmail === BOOTSTRAP_ADMIN_EMAIL
        ? 'admin'
        : (profileData.role || 'member');
    setUserProfile({
      ...profileData,
      role: resolvedRole,
    });
    setUserRole(resolvedRole);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);

      if (!firebaseUser) {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole('member');
        setAuthLoading(false);
        return;
      }

      setCurrentUser(firebaseUser);
      try {
        await syncUserProfile(firebaseUser);
      } finally {
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = () => {};

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    await syncUserProfile(auth.currentUser);
  };

  const value = useMemo(
    () => {
      const bootstrapAdminMatch =
        normalizeEmail(currentUser?.email) === BOOTSTRAP_ADMIN_EMAIL ||
        normalizeEmail(userProfile?.email) === BOOTSTRAP_ADMIN_EMAIL;

      const effectiveRole = bootstrapAdminMatch ? 'admin' : userRole;

      return ({
      isLoggedIn: !!currentUser,
      authLoading,
      currentUser,
      userProfile,
      userRole: effectiveRole,
      login,
      logout,
      refreshProfile,
      isAdmin: effectiveRole === 'admin',
      isTrainer: effectiveRole === 'trainer',
      isMember: effectiveRole === 'member',
    });
    },
    [authLoading, currentUser, userProfile, userRole]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
