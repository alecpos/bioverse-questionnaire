import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import {
  Container,
  Box,
  Heading,
  Flex,
  Text,
  Image,
} from '@chakra-ui/react';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../contexts/AuthContext';

const Home: NextPage = () => {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const bgGradient = 'linear(to-br, blue.50, white)';
  const headingColor = 'gray.800';

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