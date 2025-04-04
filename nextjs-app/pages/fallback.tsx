import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function FallbackPage() {
  const router = useRouter();
  
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      padding={8}
      bg="white" // Explicitly set a non-blue background
      color="black" // Explicitly set text color
    >
      <Heading as="h1" size="xl" mb={6}>
        Application Fallback
      </Heading>
      
      <Text fontSize="lg" textAlign="center" mb={8}>
        The application needs to restart. Please use the buttons below to navigate.
      </Text>
      
      <Box>
        <Button 
          colorScheme="teal"
          mr={4}
          onClick={() => router.push('/')}
        >
          Go to Login
        </Button>
        
        <Button
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </Box>
    </Box>
  );
} 