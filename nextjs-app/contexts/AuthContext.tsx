import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { User } from '../lib/auth';
import { showToast } from '../utils/toastManager';

// Types
interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

// Cookie options - Updated to ensure proper sharing between client and server
const COOKIE_OPTIONS = {
  expires: 1, // 1 day
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Changed from 'strict' to 'lax' for better compatibility
};

// Create Context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  login: async () => false,
  logout: () => {},
  refreshToken: async () => false,
});

// Context Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const toast = useToast();

  // Initialize auth state from cookies
  useEffect(() => {
    const initializeAuth = () => {
      console.log('Initializing auth state...');
      try {
        const loginStatus = Cookies.get('isLoggedIn') === 'true';
        console.log('Login status from cookie:', loginStatus);
        
        if (loginStatus) {
          const userStr = localStorage.getItem('user');
          console.log('User from localStorage:', userStr ? 'Found' : 'Not found');
          
          if (userStr) {
            try {
              const userData = JSON.parse(userStr);
              setUser(userData);
              setIsAdmin(userData.is_admin);
              setIsLoggedIn(true);
              console.log('Authenticated as', userData.username, 'isAdmin:', userData.is_admin);
            } catch (e) {
              console.error('Failed to parse user data:', e);
              setIsLoggedIn(false);
              setUser(null);
              setIsAdmin(false);
              localStorage.removeItem('user');
              Cookies.remove('isLoggedIn');
              Cookies.remove('token');
            }
          } else {
            // No user data but login cookie exists - clear inconsistent state
            console.warn('Login cookie exists but no user data found');
            setIsLoggedIn(false);
            Cookies.remove('isLoggedIn');
            Cookies.remove('token');
          }
        } else {
          // Not logged in, make sure state is clean
          setIsLoggedIn(false);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (e) {
        console.error('Error during auth initialization:', e);
        setIsLoggedIn(false);
        setUser(null);
        setIsAdmin(false);
      } finally {
        // Always update isLoading state, even in case of errors
        setIsLoading(false);
        console.log('Auth initialization complete');
      }
    };
    
    // Delay auth initialization slightly to ensure it runs after component mount
    setTimeout(initializeAuth, 100);
    
    // Clean up any timeouts
    return () => {};
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      
      const { token, user } = response.data;
      
      // Set the token as a cookie
      Cookies.set('token', token, {
        expires: 1, // 1 day
        path: '/',
        sameSite: 'lax'
      });
      
      // Also store in localStorage as backup
      localStorage.setItem('bioverse_token_backup', token);
      
      // Set login status
      Cookies.set('isLoggedIn', 'true', {
        expires: 1,
        path: '/',
        sameSite: 'lax'
      });
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setIsLoggedIn(true);
      setUser(user);
      setIsAdmin(user.is_admin);
      
      // Show success message
      showToast(toast, {
        title: 'Login successful',
        description: `Welcome, ${username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Show error message
      showToast(toast, {
        title: 'Login failed',
        description: 'Login failed. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
  };

  // Logout function
  const logout = () => {
    // Clear cookies and local storage
    Cookies.remove('isLoggedIn');
    Cookies.remove('token');
    localStorage.removeItem('user');
    localStorage.removeItem('bioverse_token_backup');
    
    // Update state
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
    
    // Redirect to login page
    router.push('/');
    
    // Show logout message
    showToast(toast, {
      title: 'Logged out',
      description: 'You have been successfully logged out',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Add a token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have a backup token
      const backupToken = localStorage.getItem('bioverse_token_backup');
      
      if (backupToken) {
        // Set it as the current token
        Cookies.set('token', backupToken, {
          expires: 1,
          path: '/',
          sameSite: 'lax'
        });
        
        // Verify if it works by checking user info
        try {
          const response = await axios.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${backupToken}`
            }
          });
          
          if (response.data.user) {
            // Token is valid, update user state if needed
            setUser(response.data.user);
            setIsAdmin(response.data.user.is_admin);
            setIsLoggedIn(true);
            
            // Update cookies
            Cookies.set('isLoggedIn', 'true', {
              expires: 1,
              path: '/',
              sameSite: 'lax'
            });
            
            return true;
          }
        } catch (err) {
          console.error('Failed to validate backup token:', err);
        }
      }
      
      // If we reached here, backup token didn't work or doesn't exist
      // Try server token refresh if you have this endpoint
      try {
        const currentToken = Cookies.get('token');
        
        if (currentToken) {
          const response = await axios.post('/api/auth/refresh', {}, {
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          });
          
          if (response.data.token) {
            // Set the new token
            Cookies.set('token', response.data.token, {
              expires: 1,
              path: '/',
              sameSite: 'lax'
            });
            
            // Update backup
            localStorage.setItem('bioverse_token_backup', response.data.token);
            
            return true;
          }
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
      
      // If all refresh attempts fail, logout
      logout();
      return false;
    } catch (error) {
      console.error('Error in refreshToken:', error);
      return false;
    }
  }, [logout]);

  // Log whenever auth state changes
  useEffect(() => {
    console.log('Auth state updated:', { 
      isLoggedIn,
      isAdmin,
      userId: user?.id
    });
  }, [isLoggedIn, isAdmin, user]);

  // Context value
  const contextValue: AuthContextType = {
    user,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    refreshToken,
  };

  // Provide the context to the app
  return (
    <AuthContext.Provider value={contextValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext); 