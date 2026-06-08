// context/AuthContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');

      console.log('Checking stored data - Token exists:', !!token, 'UserData exists:', !!storedUserData);

      // If token exists but no user data, clear everything
      if (token && !storedUserData) {
        console.log('Incomplete auth data found, clearing...');
        await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
        setUserToken(null);
        setUserData(null);
        setIsLoading(false);
        return;
      }

      // If both exist, validate the user data
      if (token && storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);

          // Check if userData has required fields
          if (parsedUserData && parsedUserData.role && parsedUserData.id) {
            setUserToken(token);
            setUserData(parsedUserData);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Valid auth data loaded');
          } else {
            // User data is corrupted or missing required fields
            console.log('Invalid user data structure, clearing...');
            await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
            setUserToken(null);
            setUserData(null);
          }
        } catch (parseError) {
          console.log('Error parsing user data:', parseError);
          await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
          setUserToken(null);
          setUserData(null);
        }
      }
    } catch (e) {
      console.log('Error checking token', e);
      await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
      setUserToken(null);
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, user) => {
    try {
      setIsLoading(true);

      // Validate user object
      if (!user || !user.role) {
        console.error('Invalid user data passed to login');
        throw new Error('Invalid user data');
      }

      setUserToken(token);
      setUserData(user);

      // Save both token and user data
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      // Set auth header for API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('Login successful, user data saved');
    } catch (error) {
      console.error('Login storage error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setUserToken(null);
      setUserData(null);

      // Remove auth data
      await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);

      // Remove auth header
      delete api.defaults.headers.common['Authorization'];

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      login,
      logout,
      isLoading,
      userToken,
      userData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};