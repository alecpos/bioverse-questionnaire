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
  clearInvalidCredentials: () => void;
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
  clearInvalidCredentials: () => {},
});

// Context Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const toast = useToast();

  // Function to clear invalid credentials
  const clearInvalidCredentials = useCallback(() => {
    console.log('Clearing invalid credentials due to token verification failure');
    Cookies.remove('isLoggedIn');
    Cookies.remove('token');
    localStorage.removeItem('user');
    localStorage.removeItem('bioverse_token_backup');
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
    
    // Only redirect if we're not already on the login page
    if (router.pathname !== '/') {
      router.push('/');
    }
  }, [router]);

  // Initialize auth state from cookies - update the useEffect to handle invalid tokens
  useEffect(() => {
    const initializeAuth = async () => {
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
              
              // Set user data immediately to prevent flashing
              setUser(userData);
              setIsAdmin(userData.is_admin);
              setIsLoggedIn(true);
              
              // Then verify the token validity asynchronously (without causing rerender)
              const currentToken = Cookies.get('token');
              if (currentToken) {
                try {
                  const response = await axios.get('/api/auth/me', {
                    headers: {
                      Authorization: `Bearer ${currentToken}`
                    }
                  });
                  
                  if (!response.data.user) {
                    // Only clear if token is invalid (silently)
                    clearInvalidCredentials();
                  }
                } catch (err) {
                  console.error('Token verification failed during init:', err);
                  clearInvalidCredentials();
                }
              } else {
                console.warn('No token found but login status is true');
                clearInvalidCredentials();
              }
            } catch (e) {
              console.error('Failed to parse user data:', e);
              clearInvalidCredentials();
            }
          } else {
            // No user data but login cookie exists - clear inconsistent state
            console.warn('Login cookie exists but no user data found');
            clearInvalidCredentials();
          }
        } else {
          // Not logged in, make sure state is clean
          setIsLoggedIn(false);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (e) {
        console.error('Error during auth initialization:', e);
        clearInvalidCredentials();
      } finally {
        // Always update isLoading state, even in case of errors
        setIsLoading(false);
        console.log('Auth initialization complete');
      }
    };
    
    // Run auth initialization immediately instead of with delay
    initializeAuth();
    
    // No cleanup needed
  }, [clearInvalidCredentials]);

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
  const logout = useCallback(async () => {
    // Update isLoading state to prevent loading screen
    setIsLoading(true);
    
    try {
      // Call the logout API
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Error calling logout API:', error);
    }

    // Clear cookies and local storage
    Cookies.remove('isLoggedIn');
    Cookies.remove('token');
    localStorage.removeItem('user');
    localStorage.removeItem('bioverse_token_backup');
    
    // Update state - ensure we update isLoading to false
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
    setIsLoading(false);
    
    // Show logout message before redirect
    showToast(toast, {
      title: 'Logged out',
      description: 'You have been successfully logged out',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    // Redirect to login page
    router.push('/');
  }, [router, toast]);

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
    clearInvalidCredentials,
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