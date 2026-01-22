import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Props {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const typeClasses = {
  success: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300'
};

export const Toast: React.FC<Props> = ({ 
  message, 
  type, 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow time for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed bottom-4 right-4 p-4 rounded-lg border shadow-lg
        transition-opacity duration-300 ease-in-out
        ${typeClasses[type]}
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="flex items-center justify-between">
        <p className="mr-4">{message}</p>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};