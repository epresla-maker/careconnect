// context/AuthContext.js
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut as authSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

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

        // Frissítjük a lastSeen értéket (setDoc merge-el hogy ne dobjon hibát ha nincs doc)
        setDoc(userDocRef, {
          lastSeen: serverTimestamp()
        }, { merge: true });

        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            setUserData(docSnap.exists() ? docSnap.data() : null);
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

  // LastSeen frissítés 30 másodpercenként
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const userDocRef = doc(db, "users", user.uid);
      setDoc(userDocRef, {
        lastSeen: serverTimestamp()
      }, { merge: true });
    }, 30000); // 30 másodperc

    return () => clearInterval(interval);
  }, [user]);

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
