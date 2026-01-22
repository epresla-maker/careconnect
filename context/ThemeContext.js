// context/ThemeContext.js
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Betöltjük a sötét mód beállítását
  useEffect(() => {
    setMounted(true);
    
    // Először localStorage-ból töltjük be (gyorsabb)
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // Ha van userData, szinkronizáljuk
  useEffect(() => {
    if (userData?.darkMode !== undefined) {
      setDarkMode(userData.darkMode);
      localStorage.setItem('darkMode', userData.darkMode.toString());
    }
  }, [userData]);

  // Apply dark mode to document
  useEffect(() => {
    if (!mounted) return;
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.colorScheme = 'light';
    }
  }, [darkMode, mounted]);

  // Sötét mód váltás és mentés
  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkMode', newValue.toString());
    
    // Mentés Firestore-ba
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          darkMode: newValue
        });
      } catch (error) {
        console.error("Error updating dark mode:", error);
      }
    }
  };

  const value = {
    darkMode,
    toggleDarkMode,
    theme: darkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
