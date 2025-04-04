import React from 'react';
import { Box, Flex, Text, Button, HStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const router = useRouter();
  
  const bgColor = 'white';
  const borderColor = 'gray.200';
  
  const handleLogout = () => {
    logout();
    router.push('/');
  };
  
  const navigateToHome = () => {
    if (isLoggedIn) {
      if (user?.is_admin) {
        router.push('/admin');
      } else {
        router.push('/questionnaires');
      }
    } else {
      router.push('/');
    }
  };
  
  return (
    <Box
      as="header"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      py={3}
      px={4}
      shadow="sm"
    >
      <Flex justify="space-between" align="center" maxW="container.xl" mx="auto">
        <Text
          fontWeight="bold"
          fontSize="xl"
          cursor="pointer"
          onClick={navigateToHome}
          color={'blue.600'}
        >
          BIOVERSE
        </Text>
        
        <HStack spacing={4}>
          {isLoggedIn && (
            <Button
              size="sm"
              onClick={handleLogout}
              variant="outline"
              colorScheme="blue"
            >
              Logout
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header; 