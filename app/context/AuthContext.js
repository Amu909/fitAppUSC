import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseconfig';

const BOOTSTRAP_ADMIN_EMAIL = 'admin@fitapp.com';
const normalizeEmail = (value) => (value || '').trim().toLowerCase();
const PROFILE_CACHE_KEY = 'fitapp_user_profile_cache';

const readCachedProfile = (uid) => {
  if (typeof localStorage === 'undefined' || !uid) return null;
  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_KEY}:${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedProfile = (uid, profile) => {
  if (typeof localStorage === 'undefined' || !uid || !profile) return;
  try {
    localStorage.setItem(`${PROFILE_CACHE_KEY}:${uid}`, JSON.stringify(profile));
  } catch {
    // Ignore cache write errors.
  }
};

const buildFallbackProfile = (firebaseUser, cachedProfile = null) => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email || cachedProfile?.email || '',
  fullName: cachedProfile?.fullName || firebaseUser.displayName || '',
  role: cachedProfile?.role || 'member',
  goal: cachedProfile?.goal || 'maintain',
  age: cachedProfile?.age ?? null,
  weight: cachedProfile?.weight ?? null,
  height: cachedProfile?.height ?? null,
  gender: cachedProfile?.gender || 'male',
  activity_level: cachedProfile?.activity_level || 'moderate',
  allergies: cachedProfile?.allergies || '',
  preferences: cachedProfile?.preferences || '',
  body_fat_percentage: cachedProfile?.body_fat_percentage ?? null,
  waist_circumference: cachedProfile?.waist_circumference ?? null,
  neck_circumference: cachedProfile?.neck_circumference ?? null,
  hip_circumference: cachedProfile?.hip_circumference ?? null,
  isVegetarian: cachedProfile?.isVegetarian ?? false,
  isDiabetic: cachedProfile?.isDiabetic ?? false,
  isHypertensive: cachedProfile?.isHypertensive ?? false,
  photoURL: cachedProfile?.photoURL || firebaseUser.photoURL || '',
  active: cachedProfile?.active ?? true,
});

const AuthContext = createContext({
  isLoggedIn: false,
  authLoading: true,
  currentUser: null,
  userProfile: null,
  userRole: 'member',
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  updateLocalProfile: () => {},
});

export const AuthProvider = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('member');

  const syncUserProfile = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const isBootstrapAdmin = normalizeEmail(firebaseUser.email) === BOOTSTRAP_ADMIN_EMAIL;
    const cachedProfile = readCachedProfile(firebaseUser.uid);

    let snapshot;
    try {
      snapshot = await getDoc(userRef);
    } catch {
      const fallbackProfile = {
        ...buildFallbackProfile(firebaseUser, cachedProfile),
        role: isBootstrapAdmin ? 'admin' : (cachedProfile?.role || 'member'),
      };
      setUserProfile(fallbackProfile);
      setUserRole(fallbackProfile.role);
      return fallbackProfile;
    }

    if (!snapshot.exists()) {
      const defaultProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: firebaseUser.displayName || '',
        role: isBootstrapAdmin ? 'admin' : 'member',
        photoURL: firebaseUser.photoURL || '',
        active: true,
        createdAt: serverTimestamp(),
      };
      try {
        await setDoc(userRef, defaultProfile);
      } catch {
        const fallbackProfile = {
          ...buildFallbackProfile(firebaseUser, cachedProfile),
          role: isBootstrapAdmin ? 'admin' : 'member',
        };
        writeCachedProfile(firebaseUser.uid, fallbackProfile);
        setUserProfile(fallbackProfile);
        setUserRole(fallbackProfile.role);
        return fallbackProfile;
      }
      const resolvedDefaultProfile = {
        ...defaultProfile,
      };
      writeCachedProfile(firebaseUser.uid, resolvedDefaultProfile);
      setUserProfile(resolvedDefaultProfile);
      setUserRole(resolvedDefaultProfile.role);
      return resolvedDefaultProfile;
    }

    const profileData = snapshot.data();
    const profileEmail = normalizeEmail(profileData.email);
    const resolvedRole =
      isBootstrapAdmin || profileEmail === BOOTSTRAP_ADMIN_EMAIL
        ? 'admin'
        : (profileData.role || 'member');
    const resolvedProfile = {
      ...profileData,
      fullName: profileData.fullName || firebaseUser.displayName || '',
      photoURL: profileData.photoURL || firebaseUser.photoURL || '',
      role: resolvedRole,
    };
    writeCachedProfile(firebaseUser.uid, resolvedProfile);
    setUserProfile(resolvedProfile);
    setUserRole(resolvedRole);
    return resolvedProfile;
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
      } catch {
        const cachedProfile = readCachedProfile(firebaseUser.uid);
        const fallbackProfile = {
          ...buildFallbackProfile(firebaseUser, cachedProfile),
          role: cachedProfile?.role || 'member',
        };
        setUserProfile(fallbackProfile);
        setUserRole(fallbackProfile.role);
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

  const updateLocalProfile = (profilePatch) => {
    if (!auth.currentUser) return;
    setUserProfile((prev) => {
      const nextProfile = {
        ...buildFallbackProfile(auth.currentUser, prev || null),
        ...(prev || {}),
        ...profilePatch,
      };
      writeCachedProfile(auth.currentUser.uid, nextProfile);
      if (nextProfile.role) {
        setUserRole(nextProfile.role);
      }
      return nextProfile;
    });
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
      updateLocalProfile,
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
