// context/ThemeContext.js
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ThemeContext = createContext();

// Témák definiálása
export const themes = {
  vibrant: {
    name: "Vibráns",
    description: "Színes, élénk design",
    colors: {
      primary: "from-blue-500 to-purple-600",
      secondary: "from-purple-500 to-pink-600",
      accent: "from-cyan-500 to-blue-600",
      success: "from-green-500 to-emerald-600",
      warning: "from-orange-500 to-red-600",
      danger: "from-red-500 to-pink-600",
      background: "bg-gray-900",
      card: "bg-gray-800",
      text: "text-white",
      textSecondary: "text-gray-300",
      border: "border-gray-700",
      hover: "hover:border-purple-500"
    }
  },
  professional: {
    name: "Professzionális",
    description: "Elegáns, komolyabb megjelenés",
    colors: {
      primary: "from-slate-600 to-slate-700",
      secondary: "from-gray-600 to-gray-700",
      accent: "from-blue-800 to-indigo-900",
      success: "from-emerald-700 to-teal-800",
      warning: "from-amber-700 to-orange-800",
      danger: "from-rose-700 to-red-800",
      background: "bg-slate-950",
      card: "bg-slate-900",
      text: "text-slate-100",
      textSecondary: "text-slate-400",
      border: "border-slate-700",
      hover: "hover:border-slate-500"
    }
  },
  minimal: {
    name: "Minimál",
    description: "Egyszerű, letisztult design",
    colors: {
      primary: "from-gray-700 to-gray-800",
      secondary: "from-gray-600 to-gray-700",
      accent: "from-gray-800 to-gray-900",
      success: "from-teal-800 to-cyan-900",
      warning: "from-yellow-800 to-amber-900",
      danger: "from-red-800 to-rose-900",
      background: "bg-black",
      card: "bg-gray-900",
      text: "text-gray-100",
      textSecondary: "text-gray-500",
      border: "border-gray-800",
      hover: "hover:border-gray-600"
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [currentTheme, setCurrentTheme] = useState("vibrant");

  // Betöltjük a user téma beállítását
  useEffect(() => {
    if (userData?.theme) {
      setCurrentTheme(userData.theme);
    }
  }, [userData]);

  // Téma váltás és mentés Firestore-ba
  const changeTheme = async (themeName) => {
    if (!themes[themeName]) return;
    
    setCurrentTheme(themeName);
    
    // Mentés Firestore-ba
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          theme: themeName
        });
      } catch (error) {
        console.error("Error updating theme:", error);
      }
    }
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
