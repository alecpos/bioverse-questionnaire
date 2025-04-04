import React, { ReactNode, useEffect, useState } from 'react';
import { Box, Flex, Spinner, useToast, Code, Text, Center } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Cookies from 'js-cookie';
import { showToast } from '../utils/toastManager';

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  requireAuth = true,
  adminOnly = false
}) => {
  const { isLoggedIn, isAdmin, user, clearInvalidCredentials } = useAuth();
  const router = useRouter();
  const toast = useToast();
  // Add state to track if we've shown an auth error toast already
  const [hasShownAuthError, setHasShownAuthError] = useState(false);
  // Add state to track initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track if user is being redirected
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Debug auth state - keep for troubleshooting
  console.log('Auth state:', { isLoggedIn, isAdmin, user, token: Cookies.get('token') });
  
  // Mark initial load as complete after first render
  useEffect(() => {
    if (isInitialLoad) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 500); // Give auth context time to initialize
      
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    // Skip auth checks on initial load to prevent flashing errors
    if (isInitialLoad) return;
    
    // Don't run redirect logic if already redirecting
    if (isRedirecting) return;
    
    // Check for invalid token scenario - token exists but we're not logged in
    const hasToken = !!Cookies.get('token');
    if (hasToken && !isLoggedIn && requireAuth) {
      console.log('Token exists but user is not logged in - likely an invalid token');
      setIsRedirecting(true);
      clearInvalidCredentials();
      router.push('/?authError=token');
      return;
    }

    // Only redirect if we're confident about the auth state
    // This helps prevent unnecessary redirects during initial loading
    if (requireAuth && isLoggedIn === false) {
      // Only show the toast once to prevent duplicates
      if (!hasShownAuthError) {
        showToast(toast, {
          title: 'Authentication required',
          description: 'Please log in to access this page.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setHasShownAuthError(true);
      }
      setIsRedirecting(true);
      router.push('/');
    } else if (adminOnly && isAdmin === false && isLoggedIn === true) {
      showToast(toast, {
        title: 'Access denied',
        description: 'You do not have permission to access this page.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsRedirecting(true);
      router.push('/questionnaires');
    }
  }, [requireAuth, adminOnly, isLoggedIn, isAdmin, router, toast, clearInvalidCredentials, hasShownAuthError, isInitialLoad, isRedirecting]);
  
  // If we're on a login-required page, user isn't logged in, and we're still in initial load
  // show proper loading state
  if (requireAuth && !isLoggedIn && (isInitialLoad || isRedirecting)) {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Navbar />
        <Center flex="1">
          <Flex direction="column" align="center" justify="center">
            <Spinner size="xl" mb={4} />
            <Text>Loading...</Text>
          </Flex>
        </Center>
      </Box>
    );
  }
  
  // Instead of preventing render, allow the content to show
  // This prevents the "blue screen" issue
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box as="main" flex="1" py={2} px={2}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 