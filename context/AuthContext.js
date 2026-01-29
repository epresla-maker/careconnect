// context/AuthContext.js
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut as authSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data());
              // Csak akkor frissítjük a lastSeen-t, ha a doc létezik
              updateDoc(userDocRef, {
                lastSeen: serverTimestamp()
              }).catch(() => {}); // Silent fail ha nincs jogosultság
            } else {
              setUserData(null);
            }
            setLoading(false); 
          },
          (error) => {
            setUserData(null);
            setLoading(false); 
          }
        );
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // LastSeen frissítés 30 másodpercenként (csak ha a user doc létezik)
  useEffect(() => {
    if (!user || !userData) return;

    const interval = setInterval(() => {
      const userDocRef = doc(db, "users", user.uid);
      updateDoc(userDocRef, {
        lastSeen: serverTimestamp()
      }).catch(() => {}); // Silent fail
    }, 30000); // 30 másodperc

    return () => clearInterval(interval);
  }, [user, userData]);

  const signOut = async () => {
    try {
      await authSignOut(auth);
    } catch (error) {
      // Silent fail
    }
  };

  const value = { user, userData, loading, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
