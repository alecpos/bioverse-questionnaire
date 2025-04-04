import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Heading,
  Flex,
  Text,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
} from '@chakra-ui/react';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import Cookies from 'js-cookie';

const Home: NextPage = () => {
  const { isLoggedIn, user, clearInvalidCredentials } = useAuth();
  const router = useRouter();
  const bgGradient = 'linear(to-br, blue.50, white)';
  const headingColor = 'gray.800';
  const [showAuthError, setShowAuthError] = useState(false);

  // Handle token error from URL parameter
  useEffect(() => {
    if (router.query.authError === 'token') {
      setShowAuthError(true);
      clearInvalidCredentials();
    }
  }, [router.query, clearInvalidCredentials]);

  // Check for token validity on page load 
  useEffect(() => {
    const hasInvalidToken = Cookies.get('token') && !isLoggedIn;
    if (hasInvalidToken) {
      setShowAuthError(true);
      clearInvalidCredentials();
    }
  }, [isLoggedIn, clearInvalidCredentials]);

  // Handle redirect for authenticated users
  useEffect(() => {
    if (isLoggedIn) {
      if (user?.is_admin) {
        router.push('/admin');
      } else {
        router.push('/questionnaires');
      }
    }
  }, [isLoggedIn, router, user]);

  return (
    <Box 
      minH="100vh" 
      bgGradient="linear(to-br, blue.50, white)"
      py={12}
      px={4}
    >
      <Container maxW="lg">
        <Flex 
          direction="column" 
          align="center" 
          justify="center" 
          minH="80vh"
        >
          {showAuthError && (
            <Alert status="error" mb={6} borderRadius="md">
              <AlertIcon />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>
                Your session has expired or is invalid. Please log in again.
              </AlertDescription>
            </Alert>
          )}

          <Flex 
            direction="column" 
            align="center" 
            mb={8}
          >
            <Image 
              src="/65b7f40d5dcd71efcf9bbe8a_BIOVERSE Branding_Option 1 (1).png" 
              alt="Bioverse Logo" 
              width="300px" 
              height="auto"
              fallback={
                <Heading 
                  fontSize="5xl" 
                  fontWeight="700" 
                  textAlign="center" 
                  bgGradient="linear(to-r, blue.600, blue.500)"
                  bgClip="text"
                  letterSpacing="tight"
                >
                  BIOVERSE
                </Heading>
              }
            />
          </Flex>
          
          <LoginForm />
          
          <Text 
            mt={8} 
            fontSize="sm" 
            color="gray.600" 
            textAlign="center"
          >
            © {new Date().getFullYear()} Bioverse, Inc. All rights reserved.
          </Text>
        </Flex>
      </Container>
    </Box>
  );
};

export default Home; 