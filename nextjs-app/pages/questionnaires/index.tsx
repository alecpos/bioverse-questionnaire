import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

// Add interface for Questionnaire type if not already defined
interface Questionnaire {
  id: number;
  name: string;
  description?: string;
}

// Define interface for QuestionnaireCard props
interface QuestionnaireCardProps {
  questionnaire: Questionnaire;
  isCompleted: boolean;
  completedDate: string | null;
  onStart: (id: number) => Promise<void>;
  cardBg: string;
  cardBorder: string;
  headingColor: string;
  textColor: string;
  descriptionColor: string;
  dateColor: string;
}

// Create a memoized QuestionnaireCard component to prevent re-renders
const QuestionnaireCard = memo(({ 
  questionnaire, 
  isCompleted, 
  completedDate, 
  onStart,
  cardBg,
  cardBorder,
  headingColor,
  textColor,
  descriptionColor,
  dateColor
}: QuestionnaireCardProps) => {
  return (
    <Box 
      key={questionnaire.id} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={cardBorder}
      overflow="hidden" 
      bg={cardBg}
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ 
        boxShadow: "md",
        transform: "translateY(-2px)" 
      }}
    >
      <Box p={6}>
        <Heading as="h3" size="md" mb={2} color={headingColor}>
          {questionnaire.name}
        </Heading>
        
        <Text color={textColor} fontSize="sm" mb={4}>
          {questionnaire.description || 'Complete this questionnaire to help us understand your needs better.'}
        </Text>
        
        {isCompleted ? (
          <Flex alignItems="center" mb={4}>
            <CheckCircleIcon color="green.500" mr={2} />
            <Text fontSize="sm" color={dateColor}>
              Completed on {completedDate}
            </Text>
          </Flex>
        ) : (
          <Text fontSize="sm" color={descriptionColor} mb={4}>
            Status: Not completed
          </Text>
        )}
        
        <Button 
          colorScheme={isCompleted ? "green" : "blue"}
          onClick={() => onStart(questionnaire.id)}
          leftIcon={isCompleted ? <CheckCircleIcon /> : undefined}
          variant={isCompleted ? "outline" : "solid"}
        >
          {isCompleted ? "Review Responses" : "Start Questionnaire"}
        </Button>
      </Box>
    </Box>
  );
});

QuestionnaireCard.displayName = 'QuestionnaireCard';

export default function Questionnaires() {
  const { questionnaires, completedQuestionnaires, isLoading, error, refetchQuestionnaires } = useQuestionnaires();
  const { isLoggedIn, user, refreshToken } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);
  
  // Ref to track if initial fetch was performed
  const didInitialFetchRef = React.useRef(false);
  
  // Refs to store values for effects without triggering reruns
  const isLoadingRef = React.useRef(isLoading);
  const questionnairesLengthRef = React.useRef(questionnaires.length);
  const errorRef = React.useRef(error);
  const refetchRef = React.useRef(refetchQuestionnaires);
  
  // Update refs when values change
  useEffect(() => {
    isLoadingRef.current = isLoading;
    questionnairesLengthRef.current = questionnaires.length;
    errorRef.current = error;
    refetchRef.current = refetchQuestionnaires;
  });
  
  // Generate colors for UI - define outside of any callbacks
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const descriptionColor = useColorModeValue('gray.500', 'gray.400');
  const dateColor = useColorModeValue('gray.600', 'gray.400');
  
  // Initial data fetch on component mount - with cleanup
  useEffect(() => {
    let isMounted = true;
    
    // Only fetch if we haven't fetched yet and there's no data
    if (!didInitialFetchRef.current && !isLoadingRef.current && questionnairesLengthRef.current === 0 && !errorRef.current) {
      didInitialFetchRef.current = true;
      
      const loadData = async () => {
        if (isMounted) {
          await refetchRef.current();
        }
      };
      
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Handle refresh query parameter
  useEffect(() => {
    const forceRefresh = router.query.refresh === 'true';
    
    if (forceRefresh) {
      // Remove the refresh parameter to avoid endless refresh
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
      
      // Manually trigger refetch, bypassing any caching
      const refreshData = async () => {
        setIsRefreshing(true);
        try {
          await refetchRef.current();
        } finally {
          setIsRefreshing(false);
        }
      };
      
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.refresh, router]);
  
  // Memoized callbacks to prevent rerenders
  const getCompletedStatus = useCallback((questionnaireId: number) => {
    return completedQuestionnaires.some(q => q.id === questionnaireId);
  }, [completedQuestionnaires]);
  
  const getCompletedDate = useCallback((questionnaireId: number) => {
    const completed = completedQuestionnaires.find(q => q.id === questionnaireId);
    if (!completed) return null;
    
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
  }, [completedQuestionnaires]);
  
  const handleStartQuestionnaire = useCallback(async (id: number) => {
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
  }, [refreshToken, router, toast]);
  
  const handleRetry = useCallback(async () => {
    // Prevent multiple clicks
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    showToast(toast, {
      title: 'Retrying...',
      description: 'Attempting to reload questionnaires',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    
    try {
      // Call refetch directly instead of using retryCount state
      await refetchQuestionnaires();
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, refetchQuestionnaires, isRefreshing]);
  
  // Calculate pagination - memoized to prevent recalculations
  const { currentQuestionnaires, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentQuestionnaires: questionnaires.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(questionnaires.length / itemsPerPage)
    };
  }, [questionnaires, currentPage, itemsPerPage]);
  
  // Change page
  const paginate = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
  }, []);
  
  // Handle items per page change
  const handleItemsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);
  
  // Memoize the actual questionnaire list to prevent unnecessary re-renders
  const questionnairesGrid = useMemo(() => {
    if (isLoading) {
      return (
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
      );
    }
    
    if (questionnaires.length === 0) {
      return (
        <Alert status="info" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={4}>
          <AlertIcon boxSize="40px" mr={0} mb={4} />
          <Text fontSize="lg" mb={2}>No questionnaires available at this time</Text>
          <Text fontSize="sm" color="gray.600">
            {error ? 'Please try refreshing the page or log out and back in.' : 'Check back later for new questionnaires.'}
          </Text>
          <Button mt={4} colorScheme="blue" onClick={handleRetry} size="sm" isLoading={isRefreshing}>
            Refresh
          </Button>
        </Alert>
      );
    }
    
    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {currentQuestionnaires.map((questionnaire) => {
          const isCompleted = getCompletedStatus(questionnaire.id);
          const completedDate = getCompletedDate(questionnaire.id);
          
          return (
            <QuestionnaireCard
              key={questionnaire.id}
              questionnaire={questionnaire}
              isCompleted={isCompleted}
              completedDate={completedDate}
              onStart={handleStartQuestionnaire}
              cardBg={cardBg}
              cardBorder={cardBorder}
              headingColor={headingColor}
              textColor={textColor}
              descriptionColor={descriptionColor}
              dateColor={dateColor}
            />
          );
        })}
      </SimpleGrid>
    );
  }, [
    isLoading, 
    error, 
    questionnaires.length, 
    currentQuestionnaires, 
    getCompletedStatus, 
    getCompletedDate, 
    handleStartQuestionnaire,
    handleRetry,
    isRefreshing,
    cardBg,
    cardBorder,
    headingColor,
    textColor,
    descriptionColor,
    dateColor
  ]);
  
  // Memoize the loading screen to prevent unnecessary rerenders
  const loadingUI = useMemo(() => {
    // Only show loading screen if user is logged in but we don't have user data yet
    if (!user && isLoggedIn && false) {
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
    return null;
  }, [user, isLoggedIn]);
  
  // Memoize the entire main UI to prevent unnecessary rerenders
  const mainUI = useMemo(() => {
    return (
      <Layout requireAuth>
        <Container maxW="container.xl" py={8}>
          <Flex justify="space-between" align="center" mb={8}>
            <Heading as="h1" color={headingColor}>
              Your Questionnaires
            </Heading>
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
              <Button size="sm" onClick={handleRetry} ml={2} isLoading={isRefreshing}>
                Retry
              </Button>
            </Alert>
          )}
          
          {questionnairesGrid}
          
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
        </Container>
      </Layout>
    );
  }, [
    // Only include the stable keys that actually affect the rendering
    // Exclude user and isLoggedIn to prevent unnecessary rerenders when auth state changes
    error,
    questionnairesGrid,
    questionnaires.length,
    itemsPerPage,
    handleItemsPerPageChange,
    currentPage,
    totalPages,
    paginate,
    handleRetry,
    isRefreshing,
    headingColor
  ]);
  
  // Return loadingUI if present, otherwise mainUI
  return loadingUI || mainUI;
} 