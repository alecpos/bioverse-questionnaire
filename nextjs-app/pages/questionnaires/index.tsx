import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Button,
  Flex,
  Badge,
  Skeleton,
  Alert,
  AlertIcon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useColorModeValue,
  useToast,
  HStack,
  Select,
  IconButton,
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, RepeatIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useQuestionnaires } from '../../contexts/QuestionnairesContext';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { formatLocalDateTime } from '../../utils/dateUtils';
import Cookies from 'js-cookie';
import { showToast } from '../../utils/toastManager';
import axios from 'axios';

export default function Questionnaires() {
  const { questionnaires, completedQuestionnaires, isLoading, error, refetchQuestionnaires } = useQuestionnaires();
  const { isLoggedIn, user, refreshToken } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [retryCount, setRetryCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);
  
  // Debug logs for troubleshooting
  useEffect(() => {
    console.log('Questionnaires component rendering with:', {
      questionnairesCount: questionnaires.length,
      completedQuestionnairesCount: completedQuestionnaires.length,
      completedQuestionnaires: completedQuestionnaires,
      currentUserId: user?.id,
      isLoading
    });
    
    // Check if we have the right user's completions
    if (user && completedQuestionnaires.length > 0) {
      console.log(`Checking if we have the correct user's completion data. Current user ID: ${user.id}`);
    }
  }, [questionnaires, completedQuestionnaires, user, isLoading]);
  
  useEffect(() => {
    // Initial data fetch on component mount
    if (!isLoading && questionnaires.length === 0 && !error) {
      refetchQuestionnaires();
    }
  }, [isLoading, questionnaires.length, error, refetchQuestionnaires]); // Include all dependencies
  
  // Add effect to refresh when the route changes to this page
  useEffect(() => {
    // Check for refresh query parameter
    const forceRefresh = router.query.refresh === 'true';
    const userParam = router.query.user ? parseInt(router.query.user as string, 10) : null;
    
    if (forceRefresh) {
      console.log(`Force refreshing questionnaires data due to refresh=true parameter${userParam ? ` for user ${userParam}` : ''}`);
      // Remove the refresh parameter to avoid endless refresh
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
    }
    
    // Fetch fresh data when navigating to this page
    refetchQuestionnaires();
    
    // Also refresh when window gets focus (coming back from another tab)
    const handleFocus = () => {
      refetchQuestionnaires();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router.pathname, router.query.refresh, router.query.user, router, refetchQuestionnaires]);
  
  useEffect(() => {
    // Refresh questionnaires data when retry count changes, not on every render
    if (retryCount > 0) {
      refetchQuestionnaires();
    }
  }, [retryCount, refetchQuestionnaires]); // Include refetchQuestionnaires in dependencies
  
  // Retry loading if there's an authentication error
  useEffect(() => {
    if (error === 'Authentication required' && isLoggedIn && user && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying questionnaire fetch (attempt ${retryCount + 1})...`);
        setRetryCount(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [error, isLoggedIn, user, retryCount]);
  
  const getCompletedStatus = (questionnaireId: number) => {
    // Debug this function to see why it might be returning false
    const isCompleted = completedQuestionnaires.some(q => q.id === questionnaireId);
    console.log(`Checking completion status for questionnaire ${questionnaireId}:`, {
      isCompleted,
      matchingCompletions: completedQuestionnaires.filter(q => q.id === questionnaireId)
    });
    return isCompleted;
  };
  
  const getCompletedDate = (questionnaireId: number) => {
    const completed = completedQuestionnaires.find(q => q.id === questionnaireId);
    if (!completed) return null;
    
    console.log('Formatting date for questionnaire:', questionnaireId);
    console.log('- completed_at:', completed.completed_at);
    console.log('- timezone_name:', completed.timezone_name || 'not provided');
    console.log('- timezone_offset:', completed.timezone_offset || 'not provided');
    
    return formatLocalDateTime(
      completed.completed_at,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      },
      completed.timezone_name,
      completed.timezone_offset
    );
  };
  
  const handleStartQuestionnaire = async (id: number) => {
    // Check auth before navigating
    const isLoggedIn = Cookies.get('isLoggedIn') === 'true';
    const token = Cookies.get('token');
    
    if (!isLoggedIn || !token) {
      const success = await refreshToken();
      
      if (!success) {
        showToast(toast, {
          title: 'Session expired',
          description: 'Please log in again to continue.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.push('/');
        return;
      }
    }
    
    router.push(`/questionnaire/${id}`);
  };
  
  const handleRetry = () => {
    showToast(toast, {
      title: 'Retrying...',
      description: 'Attempting to reload questionnaires',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    setRetryCount(prev => prev + 1);
  };
  
  // Generate colors for cards
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const descriptionColor = useColorModeValue('gray.500', 'gray.400');
  const dateColor = useColorModeValue('gray.600', 'gray.400');
  
  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentQuestionnaires = questionnaires.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(questionnaires.length / itemsPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  // Add a basic fallback for critical render failures
  if (!user) {
    return (
      <Layout requireAuth={false}>
        <Container maxW="container.md" py={8}>
          <Alert status="info">
            <AlertIcon />
            Loading user information...
          </Alert>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout requireAuth>
      <Container maxW="container.xl" py={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Heading as="h1" color={headingColor}>
            Your Questionnaires
          </Heading>
          
          {!isLoading && (
            <Button 
              leftIcon={<RepeatIcon />} 
              size="sm" 
              onClick={handleRetry}
              variant="outline"
              isLoading={isLoading}
            >
              Refresh
            </Button>
          )}
        </Flex>
        
        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            <Box flex="1">
              {error}
              {error === 'Authentication required' && (
                <Text fontSize="sm" mt={1}>
                  Your session may have expired. Please try refreshing or log in again.
                </Text>
              )}
            </Box>
            <Button size="sm" onClick={handleRetry} ml={2}>
              Retry
            </Button>
          </Alert>
        )}
        
        {isLoading ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {[1, 2, 3].map((i) => (
              <Box key={i} borderWidth="1px" borderRadius="lg" overflow="hidden" p={6}>
                <Skeleton height="20px" width="80%" mb={4} />
                <Skeleton height="15px" mb={2} />
                <Skeleton height="15px" mb={2} />
                <Skeleton height="15px" mb={6} />
                <Skeleton height="40px" width="120px" />
              </Box>
            ))}
          </SimpleGrid>
        ) : questionnaires.length === 0 ? (
          <Alert status="info" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={4}>
            <AlertIcon boxSize="40px" mr={0} mb={4} />
            <Text fontSize="lg" mb={2}>No questionnaires available at this time</Text>
            <Text fontSize="sm" color="gray.600">
              {error ? 'Please try refreshing the page or log out and back in.' : 'Check back later for new questionnaires.'}
            </Text>
            <Button mt={4} colorScheme="blue" onClick={handleRetry} size="sm">
              Refresh
            </Button>
          </Alert>
        ) : (
          <Box>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {currentQuestionnaires.map((questionnaire) => {
                const isCompleted = getCompletedStatus(questionnaire.id);
                const completedDate = getCompletedDate(questionnaire.id);
                
                return (
                  <Card 
                    key={questionnaire.id} 
                    bg={cardBg}
                    borderColor={cardBorder}
                    borderWidth="1px"
                    borderRadius="lg"
                    overflow="hidden"
                    boxShadow="sm"
                    transition="all 0.2s"
                    _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                  >
                    <CardHeader pb={0}>
                      <Flex justify="space-between" align="center">
                        <Heading size="md" color={textColor}>{questionnaire.name}</Heading>
                        {isCompleted ? (
                          <Badge colorScheme="green" display="flex" alignItems="center">
                            <CheckCircleIcon mr={1} />
                            Completed
                          </Badge>
                        ) : (
                          <Badge colorScheme="blue" display="flex" alignItems="center">
                            <TimeIcon mr={1} />
                            Pending
                          </Badge>
                        )}
                      </Flex>
                    </CardHeader>
                    
                    <CardBody>
                      <Text noOfLines={3} fontSize="sm" color={descriptionColor}>
                        {questionnaire.description}
                      </Text>
                      
                      {isCompleted && completedDate && (
                        <Text fontSize="xs" mt={2} color={dateColor}>
                          Completed on: {completedDate}
                        </Text>
                      )}
                    </CardBody>
                    
                    <CardFooter>
                      <Button
                        onClick={() => handleStartQuestionnaire(questionnaire.id)}
                        colorScheme={isCompleted ? 'gray' : 'blue'}
                        size="sm"
                        w="full"
                      >
                        {isCompleted ? 'Review Answers' : 'Start Questionnaire'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </SimpleGrid>
            
            {/* Pagination controls */}
            {questionnaires.length > 0 && (
              <Flex justify="space-between" align="center" mt={8}>
                <HStack spacing={2}>
                  <Text fontSize="sm">Show</Text>
                  <Select 
                    value={itemsPerPage} 
                    onChange={handleItemsPerPageChange} 
                    size="sm" 
                    width="70px"
                  >
                    <option value={3}>3</option>
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </Select>
                  <Text fontSize="sm">per page</Text>
                </HStack>
                
                <HStack spacing={2}>
                  <IconButton
                    aria-label="Previous page"
                    icon={<ChevronLeftIcon />}
                    size="sm"
                    isDisabled={currentPage === 1}
                    onClick={() => paginate(currentPage - 1)}
                  />
                  
                  <Text fontSize="sm">
                    Page {currentPage} of {totalPages}
                  </Text>
                  
                  <IconButton
                    aria-label="Next page"
                    icon={<ChevronRightIcon />}
                    size="sm"
                    isDisabled={currentPage === totalPages}
                    onClick={() => paginate(currentPage + 1)}
                  />
                </HStack>
              </Flex>
            )}
          </Box>
        )}
      </Container>
    </Layout>
  );
} 