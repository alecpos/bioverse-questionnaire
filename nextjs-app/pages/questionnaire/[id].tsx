import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Textarea,
  Stack,
  Text,
  VStack,
  Checkbox,
  CheckboxGroup,
  Spinner,
  Progress,
  Alert,
  AlertIcon,
  IconButton,
  Tooltip,
  HStack,
  Flex,
  Badge,
  useToast,
  useDisclosure,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Cookies from 'js-cookie';
import { useQuestionnaires } from '../../contexts/QuestionnairesContext';
import { getUserTimezone, getTimezoneOffsetString } from '../../utils/dateUtils';
import { submitResponses, deleteResponses } from '../../lib/api';
import { showToast } from '../../utils/toastManager';

interface Question {
  id: number;
  text: string;
  type: 'text' | 'multiple_choice' | 'text_input';
  priority: number;
  options?: string[];
}

interface Questionnaire {
  id: number;
  name: string;
  questions: Question[];
}

interface ResponseData {
  questionId: number;
  response: string | string[];
  type: 'text' | 'multiple_choice';
  fromOtherQuestionnaire?: boolean;
}

// Default USER_INFO is a fallback for when context isn't available
const USER_INFO = { id: 0, username: 'guest', isAdmin: false };

// Sanitize user input to prevent XSS attacks
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export default function QuestionnaireForm() {
  const router = useRouter();
  const { id } = router.query;
  const { user, refreshToken } = useAuth();
  const toast = useToast();
  const { refetchQuestionnaires } = useQuestionnaires();
  
  // Delete confirmation modal controls
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // State variables - moved to the top level of the component
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [prefillSource, setPrefillSource] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPrefilled, setHasPrefilled] = useState<boolean>(false);
  const [formModified, setFormModified] = useState<boolean>(false);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState<boolean>(false);

  // Generate colors - moved outside conditional renders
  const cardBg = useColorModeValue('white', 'gray.700');
  const infoTextColor = useColorModeValue('blue.600', 'blue.300');
  const prefillBg = useColorModeValue('blue.50', 'blue.900');
  const regularBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const hoverBorderColor = useColorModeValue('gray.400', 'gray.500');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const checkboxBg = useColorModeValue('gray.50', 'gray.600');
  const checkboxBorderColor = useColorModeValue('gray.200', 'gray.600');

  // Check if user is logged in and refresh token if needed
  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = Cookies.get('isLoggedIn') === 'true';
      const token = Cookies.get('token');
      
      if (!isLoggedIn || !token) {
        // Instead of immediately redirecting, try to refresh the token first
        const success = await refreshToken();
        
        if (!success) {
          toast({
            title: 'Session expired',
            description: 'Please log in again to continue.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          router.push('/');
        }
      }
    };
    
    checkAuth();
  }, [router, toast, refreshToken]);
  
  // Load questionnaire data with better error handling
  useEffect(() => {
    if (id) {
      const fetchQuestionnaire = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Get token for API request
          const token = Cookies.get('token');
          
          // Fetch questionnaire with questions
          const response = await axios.get(`/api/questionnaires/${id}`, {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined
            }
          });
          
          setQuestionnaire(response.data);
          
          // Check for previously saved responses
          try {
            const userId = user?.id || USER_INFO.id;
            const previousResponsesResponse = await axios.get(
              `/api/responses/user/${userId}/questionnaire/${id}`,
              {
                headers: {
                  Authorization: token ? `Bearer ${token}` : undefined
                }
              }
            );
            
            if (previousResponsesResponse.data && previousResponsesResponse.data.questions) {
              const questionsWithResponses = previousResponsesResponse.data.questions;
              const previousData: { [key: string]: any } = {};
              const prefillSourceMap: { [key: string]: boolean } = {};
              let hasAnyPrefilled = false;
              
              // Format the responses for our form
              questionsWithResponses.forEach((question: any) => {
                if (question.answer !== null) {
                  previousData[`question_${question.id}`] = question.answer;
                  prefillSourceMap[`question_${question.id}`] = !!question.fromOtherQuestionnaire;
                  
                  if (question.fromOtherQuestionnaire) {
                    hasAnyPrefilled = true;
                  }
                } else {
                  // Initialize empty values for questions without answers
                  if (question.type === 'multiple_choice') {
                    previousData[`question_${question.id}`] = [];
                  } else {
                    previousData[`question_${question.id}`] = '';
                  }
                }
              });
              
              setFormData(previousData);
              setPrefillSource(prefillSourceMap);
              setHasPrefilled(hasAnyPrefilled);
              setHasCompletedQuestionnaire(previousResponsesResponse.data.hasCompletedQuestionnaire);
              
              if (previousResponsesResponse.data.hasResponses) {
                toast({
                  title: 'Previous responses loaded',
                  description: hasAnyPrefilled 
                    ? 'Some answers were pre-filled from your responses to other questionnaires.'
                    : 'Your previous answers have been loaded.',
                  status: 'info',
                  duration: 5000,
                  isClosable: true,
                });
              }
            } else {
              // Initialize empty form data
              initializeFormData(response.data.questions);
            }
          } catch (err: any) {
            // More specific error handling for previous responses
            if (err.response?.status === 401 || err.response?.status === 403) {
              // Try to refresh token
              const success = await refreshToken();
              
              if (success) {
                // Re-fetch with new token
                const newToken = Cookies.get('token');
                // ... retry the fetch with new token ...
              } else {
                console.error('Authentication failed:', err);
                setError('Your session has expired. Please log in again.');
              }
            } else {
              console.log('No previous responses found, initializing empty form');
              initializeFormData(response.data.questions);
            }
          }
        } catch (err: any) {
          // Handle authentication errors in the main request
          if (err.response?.status === 401 || err.response?.status === 403) {
            const success = await refreshToken();
            if (!success) {
              setError('Your session has expired. Please log in again.');
              toast({
                title: 'Session expired',
                description: 'Please log in again to continue.',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          } else {
            console.error('Error fetching questionnaire:', err);
            setError('Failed to load the questionnaire. Please try again later.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchQuestionnaire();
    }
  }, [id, toast, user, refreshToken]);
  
  // Initialize empty form data
  const initializeFormData = (questions: Question[]) => {
    const initialData: { [key: string]: any } = {};
    
    if (questions && Array.isArray(questions)) {
      questions.forEach(question => {
        if (question.type === 'multiple_choice') {
          initialData[`question_${question.id}`] = [];
        } else {
          initialData[`question_${question.id}`] = '';
        }
      });
    }
    
    setFormData(initialData);
  };

  // Add unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formModified) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formModified]);

  // Create a reusable custom checkbox component
  const CustomCheckbox = ({ option, isPrefilled, ...props }: { option: string; isPrefilled: boolean; [key: string]: any }) => (
    <Checkbox 
      {...props}
      value={option}
      bg={isPrefilled ? prefillBg : regularBg}
      p={2}
      borderRadius="md"
      borderColor={checkboxBorderColor}
      _hover={{
        bg: checkboxBg
      }}
    >
      {option}
    </Checkbox>
  );
  
  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input before storing
    const sanitizedValue = sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));
    
    // Mark form as modified
    setFormModified(true);
    
    // Once user modifies a pre-filled field, remove the "from other questionnaire" flag
    if (prefillSource[name]) {
      setPrefillSource(prev => ({
        ...prev,
        [name]: false
      }));
    }
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (questionId: number, selectedValues: string[]) => {
    const fieldName = `question_${questionId}`;
    setFormData(prev => ({
      ...prev,
      [fieldName]: selectedValues,
    }));
    
    // Mark form as modified
    setFormModified(true);
    
    // Once user modifies a pre-filled field, remove the "from other questionnaire" flag
    if (prefillSource[fieldName]) {
      setPrefillSource(prev => ({
        ...prev,
        [fieldName]: false
      }));
    }
    
    // Clear error when user selects an option
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!questionnaire) return false;
    
    const newErrors: { [key: string]: string } = {};
    
    questionnaire.questions.forEach(question => {
      const fieldName = `question_${question.id}`;
      const value = formData[fieldName];
      
      if (question.type === 'text' || question.type === 'text_input') {
        if (!value || !value.trim()) {
          newErrors[fieldName] = 'This field is required';
        }
      } else if (question.type === 'multiple_choice') {
        if (!value || value.length === 0) {
          newErrors[fieldName] = 'Please select at least one option';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !questionnaire || !user) {
      showToast(toast, {
        title: 'Please check your answers',
        description: 'Some required fields are missing or invalid.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the data for submission with the correct structure
      const formattedResponses = Object.entries(formData).map(([key, value]) => {
        const questionId = parseInt(key.replace('question_', ''));
        
        // Match the API's expected format with 'answer' instead of 'response'
        return {
          questionId,
          answer: value // This matches the format expected by the API
        };
      });
      
      // Add timezone information to the submission
      const submissionData = {
        questionnaireId: Number(id),
        responses: formattedResponses,
        timezone: {
          name: getUserTimezone(),
          offset: getTimezoneOffsetString()
        }
      };
      
      const result = await submitResponses(submissionData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit questionnaire');
      }
      
      // Reset form modified state since we've successfully submitted
      setFormModified(false);
      
      // Make sure to refetch questionnaires before redirecting
      await refetchQuestionnaires();
      
      showToast(toast, {
        title: 'Questionnaire submitted',
        description: 'Your responses have been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect to questionnaires page
      router.push('/questionnaires');
    } catch (err: any) {
      console.error('Error submitting responses:', err);
      showToast(toast, {
        title: 'An error occurred',
        description: err.message || 'Unable to submit the questionnaire. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResponses = async () => {
    if (!questionnaire) return;
    
    setIsDeleting(true);
    
    try {
      // Ensure we're using the numeric ID
      const questionnaireId = typeof id === 'string' ? parseInt(id, 10) : Number(id);
      
      // ONLY allow deleting the current user's own responses
      const userId = user?.id || USER_INFO.id; // Safely access user.id with optional chaining
      
      console.log(`Deleting responses for user ${userId}, questionnaire ${questionnaireId}`);
      
      const result = await deleteResponses(userId, questionnaireId);
      
      if (result.success) {
        // Make sure to refetch questionnaires before redirecting
        try {
          await refetchQuestionnaires();
          console.log('Successfully refetched questionnaires after deletion');
        } catch (refetchErr) {
          console.error('Error refetching questionnaires:', refetchErr);
        }
        
        showToast(toast, {
          title: 'Responses deleted',
          description: `Your responses have been successfully deleted. ${result.stats ? `(${result.stats.responsesDeleted} responses, ${result.stats.completionsDeleted} completion records)` : ''}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Reset form data
        initializeFormData(questionnaire.questions);
        
        // Reset prefill state
        setPrefillSource({});
        setHasPrefilled(false);
        setHasCompletedQuestionnaire(false);
        
        // Close the modal
        onClose();
        
        // Redirect back to questionnaires page with a force refresh flag and the current user ID
        router.push(`/questionnaires?refresh=true&user=${userId}`);
      } else {
        throw new Error(result.error || 'Failed to delete responses');
      }
    } catch (err: any) {
      console.error('Error deleting responses:', err);
      showToast(toast, {
        title: 'An error occurred',
        description: err.message || 'Unable to delete responses. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout requireAuth={false}>
        <Container maxW="container.md" py={8}>
          <Box textAlign="center">
            <Spinner size="xl" />
            <Text mt={4}>Loading questionnaire...</Text>
          </Box>
        </Container>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxW="container.md" py={10}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
        <Button mt={4} onClick={() => router.push('/questionnaires')}>
          Back to Questionnaires
        </Button>
      </Container>
    );
  }

  // Show not found state
  if (!questionnaire) {
    return (
      <Container maxW="container.md" py={10}>
        <Alert status="error">
          <AlertIcon />
          Questionnaire not found
        </Alert>
        <Button mt={4} onClick={() => router.push('/questionnaires')}>
          Back to Questionnaires
        </Button>
      </Container>
    );
  }

  return (
    <Layout requireAuth>
      <Container maxW="container.md" py={10}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Flex justify="space-between" align="center">
              <Heading size="lg">{questionnaire.name}</Heading>
              
              {hasCompletedQuestionnaire && (
                <Tooltip label="Delete all responses for this questionnaire">
                  <IconButton
                    aria-label="Delete responses"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="outline"
                    onClick={onOpen}
                    size="sm"
                  />
                </Tooltip>
              )}
            </Flex>
            
            <Text color={textColor} mt={2}>
              Please complete all fields below
            </Text>
            
            {hasPrefilled && (
              <Alert status="info" mt={4}>
                <AlertIcon />
                <Text>
                  Some answers are pre-filled from your previous responses to other questionnaires.
                  Feel free to edit any pre-filled answers if needed.
                </Text>
              </Alert>
            )}

            {/* Add progress indicator */}
            <Box mt={6}>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Completion Progress</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {Math.round((Object.keys(formData).filter(k => 
                    formData[k] && (Array.isArray(formData[k]) ? formData[k].length > 0 : formData[k].trim() !== '')
                  ).length / questionnaire.questions.length) * 100)}%
                </Text>
              </Flex>
              <Progress 
                value={(Object.keys(formData).filter(k => 
                  formData[k] && (Array.isArray(formData[k]) ? formData[k].length > 0 : formData[k].trim() !== '')
                ).length / questionnaire.questions.length) * 100} 
                colorScheme="green" 
                size="md"
                borderRadius="md"
                hasStripe
              />
            </Box>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              {questionnaire.questions.map((question) => {
                const fieldName = `question_${question.id}`;
                const isPrefilled = prefillSource[fieldName];
                
                return (
                  <FormControl key={question.id} isInvalid={!!errors[fieldName]}>
                    <HStack alignItems="flex-start" spacing={2}>
                      <FormLabel mb={2} width="full">
                        {question.text}
                      </FormLabel>
                      
                      {isPrefilled && (
                        <Tooltip 
                          label="This answer was pre-filled from another questionnaire you completed" 
                          placement="top"
                          hasArrow
                        >
                          <Badge colorScheme="purple" borderRadius="full" px={2} ml={2}>
                            Auto-filled
                          </Badge>
                        </Tooltip>
                      )}
                    </HStack>
                    
                    {question.type === 'text' || question.type === 'text_input' ? (
                      question.text.toLowerCase().includes('tell us') || 
                      question.text.toLowerCase().includes('please list') ? (
                        <Textarea
                          name={fieldName}
                          value={formData[fieldName] || ''}
                          onChange={handleTextChange}
                          placeholder="Enter your answer here..."
                          size="md"
                          bg={isPrefilled ? prefillBg : regularBg}
                          borderColor={borderColor}
                          _hover={{ borderColor: hoverBorderColor }}
                        />
                      ) : (
                        <Input
                          name={fieldName}
                          value={formData[fieldName] || ''}
                          onChange={handleTextChange}
                          placeholder="Enter your answer here..."
                          size="md"
                          bg={isPrefilled ? prefillBg : regularBg}
                          borderColor={borderColor}
                          _hover={{ borderColor: hoverBorderColor }}
                        />
                      )
                    ) : (
                      <CheckboxGroup
                        value={formData[fieldName] || []}
                        onChange={(values) => handleCheckboxChange(question.id, values as string[])}
                      >
                        <Stack spacing={2}>
                          {question.options && question.options.length > 0 ? (
                            question.options.map((option) => (
                              <CustomCheckbox 
                                key={option} 
                                option={option}
                                isPrefilled={isPrefilled}
                              />
                            ))
                          ) : (
                            <Text color="red.500">No options available for this question</Text>
                          )}
                        </Stack>
                      </CheckboxGroup>
                    )}
                    
                    {errors[fieldName] && (
                      <FormErrorMessage>{errors[fieldName]}</FormErrorMessage>
                    )}
                  </FormControl>
                );
              })}
            </Stack>

            <Flex mt={6} justifyContent="space-between">
              <Button
                variant="outline"
                onClick={() => router.push('/questionnaires')}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                size="lg"
                type="submit"
                isLoading={isSubmitting}
                loadingText="Submitting..."
              >
                Submit Questionnaire
              </Button>
            </Flex>
          </form>
        </VStack>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete All Responses</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete all your responses for this questionnaire? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleDeleteResponses}
              isLoading={isDeleting}
              loadingText="Deleting..."
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
} 