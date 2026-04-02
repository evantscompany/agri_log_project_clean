import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null); // 'mechanic' or 'owner'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserRole = async (role) => {
    try {
      await AsyncStorage.setItem('userRole', role);
      setUserRole(role);
    } catch (error) {
      console.error('Failed to save user role:', error);
    }
  };

  const clearUserRole = async () => {
    try {
      await AsyncStorage.removeItem('userRole');
      setUserRole(null);
    } catch (error) {
      console.error('Failed to clear user role:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        isLoading,
        saveUserRole,
        clearUserRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
