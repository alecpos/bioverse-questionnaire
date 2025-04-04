import React from 'react';
import { Box, Text, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function TestPage() {
  const router = useRouter();
  
  return (
    <Box p={8} bg="white" minH="100vh">
      <Text fontSize="xl" mb={4}>Test Page</Text>
      <Text mb={4}>If you can see this page, your application is working!</Text>
      
      <Button colorScheme="blue" onClick={() => router.push('/')}>
        Go to Home
      </Button>
    </Box>
  );
} 