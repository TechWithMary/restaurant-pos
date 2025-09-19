import { createContext, useContext, useState, ReactNode } from 'react';

// Tipos para el contexto de autenticación
export interface AuthState {
  isAuthenticated: boolean;
  mesero_id: number | null;
  mesa_id: number | null;
  role: 'mesero' | 'admin' | 'cajero' | null;
  numberOfPeople?: number;
}

interface AuthContextType {
  auth: AuthState;
  login: (mesero_id: number, role: 'mesero' | 'admin' | 'cajero') => void;
  selectTable: (mesa_id: number, numberOfPeople: number) => void;
  logout: () => void;
  clearTable: () => void;
}

// Estado inicial
const initialAuthState: AuthState = {
  isAuthenticated: false,
  mesero_id: null,
  mesa_id: null,
  role: null,
  numberOfPeople: undefined,
};

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(initialAuthState);

  const login = (mesero_id: number, role: 'mesero' | 'admin' | 'cajero') => {
    setAuth({
      isAuthenticated: true,
      mesero_id,
      mesa_id: null,
      role,
      numberOfPeople: undefined,
    });
  };

  const selectTable = (mesa_id: number, numberOfPeople: number) => {
    setAuth(prev => ({
      ...prev,
      mesa_id,
      numberOfPeople,
    }));
  };

  const logout = () => {
    setAuth(initialAuthState);
  };

  const clearTable = () => {
    setAuth(prev => ({
      ...prev,
      mesa_id: null,
      numberOfPeople: undefined,
    }));
  };

  const contextValue: AuthContextType = {
    auth,
    login,
    selectTable,
    logout,
    clearTable,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}