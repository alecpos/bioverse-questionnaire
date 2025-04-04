import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback, useMemo, memo, useRef } from 'react';
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
    .replace(/"/g, '&quot;');
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
  
  // Refs to prevent unnecessary rerenders and multiple fetches
  const hasLoadedPrefillDataRef = useRef<boolean>(false);
  const isPreviousResponseFetchingRef = useRef<boolean>(false);

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

  // Memoize the CustomCheckbox component to prevent unnecessary re-renders
  const CustomCheckbox = memo(({ option, isPrefilled, ...props }: { option: string; isPrefilled: boolean; [key: string]: any }) => (
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
), (prevProps, nextProps) => {
  // Custom comparison function to enhance memo effectiveness
  // Only re-render if these specific props change
  return (
    prevProps.option === nextProps.option &&
    prevProps.isPrefilled === nextProps.isPrefilled &&
    prevProps.isChecked === nextProps.isChecked
  );
});

CustomCheckbox.displayName = 'CustomCheckbox';

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
    if (id && !hasLoadedPrefillDataRef.current) {
      // Set the flag to prevent multiple loads
      hasLoadedPrefillDataRef.current = true;
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
          
          // Prepare initial data structure
          const questionnaireData = response.data;
          const initialData: { [key: string]: any } = {};
          
          // Initialize form data
          if (questionnaireData.questions && Array.isArray(questionnaireData.questions)) {
            questionnaireData.questions.forEach((question: { id: number; type: string }) => {
              if (question.type === 'multiple_choice') {
                initialData[`question_${question.id}`] = [];
              } else {
                initialData[`question_${question.id}`] = '';
              }
            });
          }

          try {
            // If we're already fetching previous responses, don't start another fetch
            if (isPreviousResponseFetchingRef.current) return;
            isPreviousResponseFetchingRef.current = true;
            
            const userId = user?.id || USER_INFO.id;
            // Fetch previous responses in the same pass
            const previousResponsesResponse = await axios.get(
              `/api/responses/user/${userId}/questionnaire/${id}`,
              {
                headers: {
                  Authorization: token ? `Bearer ${token}` : undefined
                }
              }
            );
            
            // Apply previous responses if they exist
            let finalFormData = { ...initialData };
            let finalPrefillSource: { [key: string]: boolean } = {};
            let hasAnyPrefilled = false;
            let completedQuestionnaire = false;
            
            if (previousResponsesResponse.data && previousResponsesResponse.data.questions) {
              const questionsWithResponses = previousResponsesResponse.data.questions;
              
              // Process all responses at once
              questionsWithResponses.forEach((question: any) => {
                if (question.answer !== null) {
                  finalFormData[`question_${question.id}`] = question.answer;
                  if (question.fromOtherQuestionnaire) {
                    finalPrefillSource[`question_${question.id}`] = true;
                    hasAnyPrefilled = true;
                  }
                }
              });
              
              completedQuestionnaire = previousResponsesResponse.data.hasCompletedQuestionnaire;
            }
            
            // Set all state at once to prevent multiple renders
            setQuestionnaire(questionnaireData);
            setFormData(finalFormData);
            setPrefillSource(finalPrefillSource);
            setHasPrefilled(hasAnyPrefilled);
            setHasCompletedQuestionnaire(completedQuestionnaire);
            setIsLoading(false);
            
          } catch (err: any) {
            console.log('Error loading previous responses:', err);
            // If we fail to get previous responses, just use the empty initialized data
            setQuestionnaire(questionnaireData);
            setFormData(initialData);
            setIsLoading(false);
          } finally {
            isPreviousResponseFetchingRef.current = false;
          }
        } catch (err: any) {
          console.error('Error fetching questionnaire:', err);
          
          if (err.response?.status === 401 || err.response?.status === 403) {
            const success = await refreshToken();
            if (!success) {
              setError('Your session has expired. Please log in again.');
              showToast(toast, {
                title: 'Session expired',
                description: 'Please log in again to continue.',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          } else {
            setError('Failed to load the questionnaire. Please try again later.');
          }
          setIsLoading(false);
        }
      };
      
      fetchQuestionnaire();
    }
  }, [id, user, refreshToken, toast]);
  
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

  // Optimize handleCheckboxChange with useCallback to maintain referential equality
  const handleCheckboxChange = useCallback((questionId: number, selectedValues: string[]) => {
    const fieldName = `question_${questionId}`;
    
    // Batch state updates
    setFormData(prev => {
      const newFormData = { ...prev, [fieldName]: selectedValues };
      
      // Update other states in this batch
      setFormModified(true);
      
      // Only update prefillSource if needed
      if (prefillSource[fieldName]) {
        setPrefillSource(prevSource => ({
          ...prevSource,
          [fieldName]: false
        }));
      }
      
      // Clear error when user selects an option
      if (errors[fieldName]) {
        setErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
      
      return newFormData;
    });
  }, [prefillSource, errors]);

  const handleTextChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
  }, [prefillSource, errors]);

  const validateForm = useCallback((): boolean => {
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
  }, [questionnaire, formData, setErrors]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
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
  }, [validateForm, questionnaire, user, formData, id, setIsSubmitting, setFormModified, refetchQuestionnaires, router, toast]);

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
        
        // Reset form data with proper initialization
        const emptyFormData: { [key: string]: any } = {};
        if (questionnaire.questions && Array.isArray(questionnaire.questions)) {
          questionnaire.questions.forEach(question => {
            if (question.type === 'multiple_choice') {
              emptyFormData[`question_${question.id}`] = [];
            } else {
              emptyFormData[`question_${question.id}`] = '';
            }
          });
        }
        setFormData(emptyFormData);
        
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

  // Memoize form rendering with useMemo to prevent re-renders of the entire form
  const questionnaireForm = useMemo(() => {
    if (!questionnaire) return null;
    
    return (
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
    );
  }, [
    questionnaire, 
    formData, 
    prefillSource, 
    errors, 
    handleCheckboxChange, 
    handleTextChange, 
    isSubmitting, 
    handleSubmit, 
    prefillBg, 
    regularBg, 
    borderColor, 
    hoverBorderColor,
    router,
    // Include CustomCheckbox to satisfy ESLint - this is safe since it's a memoized component
    // that only rerenders when specific props change (option, isPrefilled, isChecked)
    CustomCheckbox
  ]);

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
                    variant="redOutline"
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

          {questionnaireForm}
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