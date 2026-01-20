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

  console.log("[AuthContext] Render/Re-render", { loading, user: !!user, userData: !!userData });

  useEffect(() => {
    console.log("[AuthContext] FŐ useEffect lefutott (CSAK EGYSZER KELL)");
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log(`[AuthContext] onAuthStateChanged futott. User van? ${!!firebaseUser}`);
      
      if (unsubscribeSnapshot) {
        console.log("[AuthContext] Régi snapshot leállítva.");
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Frissítjük a lastSeen értéket
        updateDoc(userDocRef, {
          lastSeen: serverTimestamp()
        }).catch(err => console.error('Error updating lastSeen:', err));

        console.log("[AuthContext] Snapshot figyelő indítása a profilra...");
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            console.log("[AuthContext] Snapshot VÁLASZ megérkezett.");
            setUserData(docSnap.exists() ? docSnap.data() : null);
            console.log("[AuthContext] *** BETÖLTÉS KÉSZ (van user, van profil-info) ***");
            setLoading(false); 
          },
          (error) => {
            console.error("Hiba a user adatainak figyelésekor:", error);
            setUserData(null);
            console.log("[AuthContext] *** BETÖLTÉS KÉSZ (hiba történt) ***");
            setLoading(false); 
          }
        );
      } else {
        console.log("[AuthContext] Nincs user (kijelentkezett).");
        setUser(null);
        setUserData(null);
        console.log("[AuthContext] *** BETÖLTÉS KÉSZ (nincs user) ***");
        setLoading(false);
      }
    });

    return () => {
      console.log("[AuthContext] Fő listener leállítása.");
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // LastSeen frissítés 30 másodpercenként
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const userDocRef = doc(db, "users", user.uid);
      updateDoc(userDocRef, {
        lastSeen: serverTimestamp()
      }).catch(err => console.error('Error updating lastSeen:', err));
    }, 30000); // 30 másodperc

    return () => clearInterval(interval);
  }, [user]);

  const signOut = async () => {
    console.log("[AuthContext] signOut() hívva.");
    try {
      await authSignOut(auth);
    } catch (error) {
      console.error("Kijelentkezési hiba:", error);
    }
  };

  const value = { user, userData, loading, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
