// Lightweight Firestore Monitor - CSAK számol, nem loggol
// NEM lassítja az oldalt!

let stats = {
  reads: 0,
  writes: 0,
  deletes: 0,
  snapshots: 0,
  startTime: Date.now()
};

export const trackRead = () => stats.reads++;
export const trackWrite = () => stats.writes++;
export const trackDelete = () => stats.deletes++;
export const trackSnapshot = () => stats.snapshots++;

export const getStats = () => ({
  ...stats,
  runtime: Math.floor((Date.now() - stats.startTime) / 1000), // másodpercben
  readsPerMin: Math.round((stats.reads / ((Date.now() - stats.startTime) / 60000)) || 0),
  writesPerMin: Math.round((stats.writes / ((Date.now() - stats.startTime) / 60000)) || 0)
});

export const resetStats = () => {
  stats = {
    reads: 0,
    writes: 0,
    deletes: 0,
    snapshots: 0,
    startTime: Date.now()
  };
};
