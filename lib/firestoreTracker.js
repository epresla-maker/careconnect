// Firestore Activity Tracker
// Számolja a műveleteket és 5 percenként ment egy összesítőt
// FONTOS: A trackOperation() CSAK memóriában számol - NEM ír DB-be!

import { doc, updateDoc, increment, setDoc, serverTimestamp, getDocs as originalGetDocs, getDoc as originalGetDoc, addDoc as originalAddDoc, deleteDoc as originalDeleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// Memóriában tartjuk a számlálókat - NEM ír DB-be minden híváskor!
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

// Művelet számlálása (memóriában, NEM ír DB-be!)
export const trackOperation = (type, count = 1) => {
  if (!TRACKING_ENABLED) return;
  
  switch(type) {
    case 'read':
      stats.reads += count;
      break;
    case 'write':
      stats.writes += count;
      break;
    case 'delete':
      stats.deletes += count;
      break;
  }
};

// Összesítő mentése (5 percenként) - EZ AZ EGYETLEN WRITE!
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

// ============================================
// TRACKED WRAPPER FUNCTIONS
// Ezeket használd a komponensekben az eredeti helyett!
// ============================================

// Tracked getDocs - automatikusan számolja a reads-t
export const trackedGetDocs = async (query) => {
  const snapshot = await originalGetDocs(query);
  trackOperation('read', snapshot.size || 1);
  return snapshot;
};

// Tracked getDoc - automatikusan számolja a read-et
export const trackedGetDoc = async (docRef) => {
  const doc = await originalGetDoc(docRef);
  trackOperation('read', 1);
  return doc;
};

// Tracked addDoc - automatikusan számolja a write-ot
export const trackedAddDoc = async (collectionRef, data) => {
  const docRef = await originalAddDoc(collectionRef, data);
  trackOperation('write', 1);
  return docRef;
};

// Tracked updateDoc - automatikusan számolja a write-ot
export const trackedUpdateDoc = async (docRef, data) => {
  await updateDoc(docRef, data);
  trackOperation('write', 1);
};

// Tracked setDoc - automatikusan számolja a write-ot
export const trackedSetDoc = async (docRef, data, options) => {
  await setDoc(docRef, data, options);
  trackOperation('write', 1);
};

// Tracked deleteDoc - automatikusan számolja a delete-et
export const trackedDeleteDoc = async (docRef) => {
  await originalDeleteDoc(docRef);
  trackOperation('delete', 1);
};

// Debug: aktuális stats lekérése
export const getStats = () => ({ ...stats, userId: currentUserId });
