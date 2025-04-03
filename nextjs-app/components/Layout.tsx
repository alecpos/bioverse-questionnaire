import React, { ReactNode, useEffect } from 'react';
import { Box, Flex, Spinner, useToast, Code, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Cookies from 'js-cookie';

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
  const { isLoggedIn, isAdmin, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Debug auth state - keep for troubleshooting
  console.log('Auth state:', { isLoggedIn, isAdmin, user, token: Cookies.get('token') });
  
  useEffect(() => {
    // Only redirect if we're confident about the auth state
    // This helps prevent unnecessary redirects during initial loading
    if (requireAuth && isLoggedIn === false) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to access this page.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/');
    } else if (adminOnly && isAdmin === false && isLoggedIn === true) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this page.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/questionnaires');
    }
  }, [requireAuth, adminOnly, isLoggedIn, isAdmin, router, toast]);
  
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