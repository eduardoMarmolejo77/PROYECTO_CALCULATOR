import { useState, useCallback } from 'react';
import { AuthContext } from './AuthContextValue';
import * as authService from '../services/authService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  const login = useCallback((username, password) => {
    const result = authService.login(username, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  }, []);

  const register = useCallback((username, password, fullName) => {
    return authService.register(username, password, fullName);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading: false,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
