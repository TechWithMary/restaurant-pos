import React, { useState, useEffect } from 'react';

interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error';
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export const useSimpleToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useSimpleToast must be used within ToastProvider');
  }
  return context;
};

export const SimpleToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString();
    const newToast: ToastData = {
      id,
      ...toast,
      duration: toast.duration || 5000,
    };
    
    console.log('SimpleToast: Adding toast:', newToast);
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      console.log('SimpleToast: Removing toast:', id);
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  };

  const removeToast = (id: string) => {
    console.log('SimpleToast: Manually removing toast:', id);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none"
        style={{ 
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 10000,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300 ${
              toast.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
            style={{
              backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              maxWidth: '384px',
              pointerEvents: 'auto'
            }}
            onClick={() => removeToast(toast.id)}
          >
            <div className="font-semibold text-sm mb-1">{toast.title}</div>
            <div className="text-sm opacity-90">{toast.message}</div>
            <div className="text-xs opacity-75 mt-2">Click to dismiss</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};