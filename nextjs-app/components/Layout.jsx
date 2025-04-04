import React, { useEffect } from 'react';
import { Box, Flex, Spinner, useToast, Code, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Cookies from 'js-cookie';

const Layout = ({ 
  children, 
  requireAuth = true,
  adminOnly = false
}) => {
  const { isLoggedIn, isAdmin, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
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