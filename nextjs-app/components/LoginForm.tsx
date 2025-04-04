import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  FormErrorMessage,
  Heading,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import Cookies from 'js-cookie';

interface FormData {
  username: string;
  password: string;
}

interface FormErrors {
  username?: string;
  password?: string;
}

export const LoginForm: React.FC = () => {
  const { login, user, clearInvalidCredentials } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({ username: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Clear any invalid tokens on form mount
  useEffect(() => {
    // Only clear tokens if there's an invalid one present, don't run on every mount
    const hasInvalidToken = Cookies.get('token') && !user;
    if (hasInvalidToken) {
      clearInvalidCredentials();
    }
  }, [clearInvalidCredentials, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear field error when typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    
    // Clear general login error
    if (loginError) {
      setLoginError(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setLoginError(null);
    
    // Clear any existing tokens before attempting login
    clearInvalidCredentials();
    
    try {
      const success = await login(formData.username, formData.password);
      
      if (success) {
        // No need to redirect as AuthContext already handles this
        console.log('Login successful');
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (error: any) {
      setLoginError(error.message || 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Use consistent light mode colors
  const bgColor = 'white';
  const borderColor = 'gray.200';
  const headingColor = 'blue.600';
  const textColor = 'gray.600';
  const labelColor = 'gray.700';

  return (
    <Box 
      p={8} 
      maxW="md" 
      mx="auto" 
      bg={bgColor} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      boxShadow="lg"
    >
      <Stack spacing={6}>
        <Heading size="lg" textAlign="center" color={headingColor} fontWeight="600">BIOVERSE Questionnaire</Heading>
        <Text fontSize="md" textAlign="center" color={textColor}>
          Sign in to access your questionnaires
        </Text>
        
        {loginError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {loginError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.username} isRequired>
              <FormLabel htmlFor="username" color={labelColor} fontWeight="500">Username</FormLabel>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                borderColor="gray.300"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(24, 118, 192, 0.6)' }}
                color="black"
                fontSize="md"
              />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.password} isRequired>
              <FormLabel htmlFor="password" color={labelColor} fontWeight="500">Password</FormLabel>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                borderColor="gray.300"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(24, 118, 192, 0.6)' }}
                color="black"
                fontSize="md"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>
            
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              fontSize="md"
              fontWeight="500"
              isLoading={isLoading}
              loadingText="Signing in..."
              w="100%"
              mt={4}
              _hover={{
                bg: 'blue.600'
              }}
            >
              Sign in
            </Button>
          </Stack>
        </form>
        
        <Text fontSize="sm" textAlign="center" color="gray.500" mt={4}>
          Example accounts: admin/admin123 (admin) or user/user123 (regular user)
        </Text>
      </Stack>
    </Box>
  );
}; 