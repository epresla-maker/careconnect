// Firestore Activity Tracker
// Számolja a műveleteket és 5 percenként ment egy összesítőt

import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Memóriában tartjuk a számlálókat
let stats = {
  reads: 0,
  writes: 0,
  deletes: 0,
  lastFlush: Date.now()
};

let currentUserId = null;
let flushInterval = null;

// Tracking engedélyezése/tiltása
const TRACKING_ENABLED = true;
const FLUSH_INTERVAL = 300000; // 5 perc

export const initTracker = (userId) => {
  if (!TRACKING_ENABLED || !userId) return;
  
  currentUserId = userId;
  
  // Korábbi interval törlése
  if (flushInterval) {
    clearInterval(flushInterval);
  }
  
  // 5 percenként flush
  flushInterval = setInterval(() => {
    flushStats();
  }, FLUSH_INTERVAL);
  
  // Oldal bezárásakor is flush
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushStats);
  }
};

export const stopTracker = () => {
  flushStats();
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  currentUserId = null;
};

// Művelet számlálása (memóriában, nem ír DB-be)
export const trackOperation = (type) => {
  if (!TRACKING_ENABLED) return;
  
  switch(type) {
    case 'read':
      stats.reads++;
      break;
    case 'write':
      stats.writes++;
      break;
    case 'delete':
      stats.deletes++;
      break;
  }
};

// Összesítő mentése (5 percenként)
const flushStats = async () => {
  if (!currentUserId || (stats.reads === 0 && stats.writes === 0 && stats.deletes === 0)) {
    return;
  }
  
  try {
    const today = new Date().toISOString().split('T')[0]; // "2026-01-30"
    const hour = new Date().getHours();
    
    // Napi összesítő dokumentum
    const dailyRef = doc(db, 'firestoreStats', today);
    
    await setDoc(dailyRef, {
      date: today,
      updatedAt: serverTimestamp(),
      [`hours.${hour}.reads`]: increment(stats.reads),
      [`hours.${hour}.writes`]: increment(stats.writes),
      [`hours.${hour}.deletes`]: increment(stats.deletes),
      [`users.${currentUserId}.reads`]: increment(stats.reads),
      [`users.${currentUserId}.writes`]: increment(stats.writes),
      totalReads: increment(stats.reads),
      totalWrites: increment(stats.writes),
      totalDeletes: increment(stats.deletes),
    }, { merge: true });
    
    console.log(`📊 Stats flushed: R:${stats.reads} W:${stats.writes} D:${stats.deletes}`);
    
    // Reset
    stats = { reads: 0, writes: 0, deletes: 0, lastFlush: Date.now() };
  } catch (error) {
    console.error('Stats flush error:', error);
  }
};

// Debug: aktuális stats lekérése
export const getStats = () => ({ ...stats, userId: currentUserId });
