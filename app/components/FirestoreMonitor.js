"use client";
import { useState, useEffect, useRef } from 'react';
import { getStats, resetStats } from '@/lib/firestoreMonitor';
import { X, RotateCcw, TrendingUp, Database, Move } from 'lucide-react';

export default function FirestoreMonitor() {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 }); // bottom-4 right-4
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
    }, 1000); // Frissítés másodpercenként

    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return; // Ne húzzuk ha gombra kattintunk
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Boundary check
    const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 280);
    const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 400);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
        className="fixed z-[9999] bg-purple-600 text-white p-3 rounded-full shadow-2xl cursor-pointer hover:bg-purple-700 transition-all"
      >
        <Database className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ 
        bottom: `${position.y}px`, 
        right: `${position.x}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      className="fixed z-[9999] bg-gray-900 text-white p-4 rounded-xl shadow-2xl border border-purple-500 min-w-[280px] select-none"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-gray-500" />
          <Database className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm">Firestore Monitor</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white"
          >
            _
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Runtime:</span>
            <span className="font-mono">{stats.runtime}s</span>
          </div>
          
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between">
              <span className="text-green-400">📖 Reads:</span>
              <span className="font-mono font-bold">{stats.reads}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">✏️ Writes:</span>
              <span className="font-mono font-bold">{stats.writes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">🗑️ Deletes:</span>
              <span className="font-mono font-bold">{stats.deletes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">👁️ Snapshots:</span>
              <span className="font-mono font-bold">{stats.snapshots}</span>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs text-gray-400">Per Minute:</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Reads/min:</span>
              <span className={`font-mono ${stats.readsPerMin > 100 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.readsPerMin}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Writes/min:</span>
              <span className={`font-mono ${stats.writesPerMin > 10 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.writesPerMin}
              </span>
            </div>
          </div>

          <button
            onClick={resetStats}
            className="w-full mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center gap-2 text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
