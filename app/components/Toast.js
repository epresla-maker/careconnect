"use client";

import { useEffect } from 'react';

export default function Toast({ message, type = 'success', duration = 1000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[type] || 'bg-gray-500';

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg`}>
        {message}
      </div>
    </div>
  );
}
