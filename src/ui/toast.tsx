import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Toast } from './widgets';

const ToastContext = createContext<(message: string) => void>(() => {});

/** Android-style short toasts (2 s). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 2000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <Toast message={message} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
