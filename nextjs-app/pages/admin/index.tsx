import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Text,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Progress,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  HStack,
  Select,
  IconButton,
  TableContainer
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, RepeatIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { formatDate, getColorByRate } from '../../utils/formatUtils';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import Cookies from 'js-cookie';
import { AdminDashboardCharts } from '../../components/AdminDashboardCharts';
import { AdminTimeSeriesChart } from '../../components/AdminTimeSeriesChart';
import DownloadButton from '../../components/DownloadButton';
import { exportQuestionnaireToCsv } from '../../lib/api';
import { showToast } from '../../utils/toastManager';
import QuestionnaireActions from '../../components/admin/QuestionnaireActions';

interface User {
  id: number;
  username: string;
  email: string;
  completed_questionnaires: number;
  total_questionnaires: number;
}

interface QuestionnaireStats {
  id: number;
  name: string;
  completions: number;
  is_pending?: boolean;
  unique_users?: number;
  first_completion?: string;
  last_completion?: string;
  avg_completion_time_minutes?: number;
  total_responses?: number;
  unique_questions_answered?: number;
  total_questions?: number;
  completion_rate?: number;
}

interface TimeSeriesDataPoint {
  date: string;
  count: number;
}

interface DashboardStats {
  questionnaireStats: QuestionnaireStats[];
  timeSeriesData: TimeSeriesDataPoint[];
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    completionRate: number;
  };
  demographics: {
    ages: { range: string; count: number }[];
    genders: { gender: string; count: number }[];
  };
  questionnaires: any[];
  pendingQuestionnairesCount: number;
  similarQuestionnaires?: any[];
  nonPendingStats?: QuestionnaireStats[];
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [authDebug, setAuthDebug] = useState<any>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  const router = useRouter();
  const toast = useToast();
  const { isLoggedIn, isAdmin, user } = useAuth();
  
  // Add this state at the top of the component where other states are defined
  const [exportingQuestionnaireId, setExportingQuestionnaireId] = useState<number | null>(null);
  const [exportingUserId, setExportingUserId] = useState<number | null>(null);
  
  // Add this state at the top where other states are defined
  const [showAnalyticsModalFor, setShowAnalyticsModalFor] = useState<number | null>(null);
  
  // Add state to track questionnaire approval status
  const [approvingQuestionnaire, setApprovingQuestionnaire] = useState<number | null>(null);
  const [rejectingQuestionnaire, setRejectingQuestionnaire] = useState<number | null>(null);
  
  // Use consistent light mode colors
  const tableHeaderBg = 'gray.50';
  const colorScheme = 'blue';
  const headingColor = 'blue.600';
  const tabSelectedColor = 'blue.600';
  const tabSelectedBorderColor = 'blue.600';
  const scrollTrackBg = 'gray.100';
  const scrollThumbBg = 'blue.400';
  const scrollThumbHoverBg = 'blue.500';
  const statCardBg = 'white';
  const completedColor = 'green.500';
  const pendingColor = 'yellow.500';
  
  // Gather debug info when component mounts
  useEffect(() => {
    const token = Cookies.get('token');
    const backupToken = typeof window !== 'undefined' ? 
      localStorage.getItem('bioverse_token_backup') : null;
    
    setAuthDebug({
      isLoggedIn,
      isAdmin,
      hasUser: !!user,
      userId: user?.id,
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 10) + '...' : 'none',
      hasBackupToken: !!backupToken,
      backupTokenStart: backupToken ? backupToken.substring(0, 10) + '...' : 'none',
      path: router.pathname,
      timestamp: new Date().toISOString()
    });
  }, [isLoggedIn, isAdmin, user, router.pathname]);
  
  // Inside the component, get the token
  const token = Cookies.get('token');

  // Wrap fetch functions with useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching user data for admin dashboard');
      const token = Cookies.get('token');
      console.log('Using token from cookies:', token ? `${token.substring(0, 10)}...` : 'No token');
      
      const response = await axios.get('/api/admin/user-responses', {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined
        }
      });
      
      console.log('User data fetch successful:', response.data.length, 'users found');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load user data';
      
      setError(errorMsg);
      
      // Check if it's an authentication error
      if (errorMsg.includes('Authentication') || errorMsg.includes('token') || 
          err.response?.status === 401 || err.response?.status === 403) {
        
        console.error('Authentication error detected:', errorMsg);
        
        // Try to refresh authentication
        try {
          const backupToken = localStorage.getItem('bioverse_token_backup');
          if (backupToken) {
            console.log('Attempting authentication repair using backup token');
            Cookies.set('token', backupToken, {
              expires: 1,
              path: '/',
              sameSite: 'lax'
            });
            
            // Refresh page to re-authenticate
            window.location.reload();
            return;
          }
        } catch (e) {
          console.error('Failed to repair authentication:', e);
        }
      }
      
      showToast(toast, {
        title: 'Error loading user data',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const fetchDashboardStats = useCallback(async () => {
    setIsStatsLoading(true);
    setStatsError(null);
    
    try {
      console.log('Fetching dashboard stats for admin dashboard');
      const token = Cookies.get('token');
      console.log('Using token from cookies:', token ? `${token.substring(0, 10)}...` : 'No token');
      
      const response = await axios.get('/api/admin/dashboard-stats', {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined
        }
      });
      
      console.log('Dashboard stats fetch successful:', response.data);
      setDashboardStats(response.data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load dashboard statistics';
      
      setStatsError(errorMsg);
      
      showToast(toast, {
        title: 'Error loading dashboard statistics',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsStatsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchUsers();
      fetchDashboardStats();
    }
  }, [isLoggedIn, isAdmin, fetchUsers, fetchDashboardStats]);
  
  const handleViewResponses = (userId: number) => {
    router.push(`/admin/user/${userId}`);
  };
  
  const handleRefresh = () => {
    fetchUsers();
    fetchDashboardStats();
  };
  
  // Calculate pagination
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / itemsPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  // Replace getBadgeColor with our utility function 
  const getBadgeColor = getColorByRate;
  
  // Inside the AdminDashboard component
  // Add this function to handle questionnaire export
  const handleExportQuestionnaire = async (questionnaireId: number, questionnaireName: string) => {
    try {
      setExportingQuestionnaireId(questionnaireId);
      await exportQuestionnaireToCsv(questionnaireId);
      
      showToast(toast, {
        title: 'Export successful',
        description: `${questionnaireName} data has been downloaded.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error exporting questionnaire:', error);
      
      showToast(toast, {
        title: 'Export failed',
        description: error.message || 'Failed to export questionnaire data.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setExportingQuestionnaireId(null);
    }
  };
  
  // Fix the handleExportUserResponses function
  const handleExportUserResponses = async (userId: number, username: string) => {
    try {
      setExportingUserId(userId);
      
      // Get the user's responses via API call with CSV format
      const response = await axios.get(`/api/admin/user-responses/${userId}`, {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          Accept: 'text/csv'
        }
      });
      
      // Create a download link for the CSV file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user_${username}_responses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast(toast, {
        title: 'Export successful',
        description: `${username}'s responses have been downloaded.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error exporting user responses:', error);
      
      showToast(toast, {
        title: 'Export failed',
        description: error.message || 'Failed to export user responses.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setExportingUserId(null);
    }
  };
  
  // Function to handle analytics button click
  const handleShowAnalytics = (questionnaireId: number, questionnaireName: string) => {
    console.log(`Showing analytics for questionnaire: ${questionnaireName} (ID: ${questionnaireId})`);
    setShowAnalyticsModalFor(questionnaireId);
    // For now just show a toast until we implement the analytics modal
    showToast(toast, {
      title: "Analytics Feature",
      description: `Analytics for ${questionnaireName} will be available soon`,
      status: "info",
      duration: 3000,
    });
  };
  
  // Add function to handle approval/rejection of questionnaires
  const handleApproveQuestionnaire = async (questionnaireId: number, approve: boolean) => {
    try {
      if (approve) {
        setApprovingQuestionnaire(questionnaireId);
      } else {
        setRejectingQuestionnaire(questionnaireId);
      }
      
      const response = await axios.post(
        '/api/admin/approve-questionnaire',
        { questionnaire_id: questionnaireId, approve },
        {
          headers: {
            Authorization: `Bearer ${Cookies.get('token')}`
          }
        }
      );
      
      if (response.data.success) {
        showToast(toast, {
          title: approve ? 'Questionnaire Approved' : 'Questionnaire Rejected',
          description: response.data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchDashboardStats();
      }
    } catch (error: any) {
      console.error('Error approving/rejecting questionnaire:', error);
      showToast(toast, {
        title: 'Action Failed',
        description: error.response?.data?.error || 'Failed to process request',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setApprovingQuestionnaire(null);
      setRejectingQuestionnaire(null);
    }
  };
  
  return (
    <Layout requireAuth adminOnly>
      <Container maxW="container.xl" py={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Heading size="lg" color={headingColor}>Admin Dashboard</Heading>
          <Button leftIcon={<RepeatIcon />} colorScheme="blue" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </Flex>
        
        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <Tabs colorScheme={colorScheme} mb={8}>
          <TabList>
            <Tab _selected={{ color: tabSelectedColor, borderColor: tabSelectedBorderColor }}>Dashboard</Tab>
            <Tab _selected={{ color: tabSelectedColor, borderColor: tabSelectedBorderColor }}>User Management</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={0}>
              {isStatsLoading ? (
                <Flex justify="center" py={10}>
                  <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
                </Flex>
              ) : statsError ? (
                <Alert status="error" mb={6}>
                  <AlertIcon />
                  {statsError}
                </Alert>
              ) : !dashboardStats ? (
                <Alert status="info">
                  <AlertIcon />
                  No dashboard statistics available.
                </Alert>
              ) : (
                <Box>
                  {/* Charts */}
                  <AdminDashboardCharts 
                    users={users} 
                    questionnaireStats={(dashboardStats.nonPendingStats || []) as any} 
                  />
                  
                </Box>
              )}
            </TabPanel>
            
            <TabPanel px={0}>
              {isLoading ? (
                <Flex justify="center" py={10}>
                  <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
                </Flex>
              ) : users.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  No user data available.
                </Alert>
              ) : (
                <Box>
                  <TableContainer>
                    <Table variant="simple" size="md">
                      <Thead bg={tableHeaderBg}>
                        <Tr>
                          <Th>Username</Th>
                          <Th>Email</Th>
                          <Th isNumeric>Completed</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {currentUsers.map((user) => (
                          <Tr key={user.id}>
                            <Td fontWeight="medium">{user.username}</Td>
                            <Td>{user.email || 'N/A'}</Td>
                            <Td isNumeric>
                              <Badge 
                                colorScheme={getBadgeColor(
                                  (user.completed_questionnaires / user.total_questionnaires) * 100
                                )}
                                fontSize="0.8em"
                              >
                                {user.completed_questionnaires} / {user.total_questionnaires}
                              </Badge>
                            </Td>
                            <Td>
                              <Button 
                                size="sm" 
                                colorScheme="blue" 
                                variant="outline"
                                onClick={() => handleViewResponses(user.id)}
                              >
                                View Responses
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  
                  {users.length > itemsPerPage && (
                    <Flex justify="space-between" align="center" mt={4}>
                      <Select 
                        value={itemsPerPage} 
                        onChange={handleItemsPerPageChange} 
                        width="auto"
                        size="sm"
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                      </Select>
                      
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Previous page"
                          icon={<ChevronLeftIcon />}
                          onClick={() => paginate(currentPage - 1)}
                          isDisabled={currentPage === 1}
                          size="sm"
                        />
                        
                        <Box px={2}>
                          Page {currentPage} of {totalPages}
                        </Box>
                        
                        <IconButton
                          aria-label="Next page"
                          icon={<ChevronRightIcon />}
                          onClick={() => paginate(currentPage + 1)}
                          isDisabled={currentPage === totalPages}
                          size="sm"
                        />
                      </HStack>
                    </Flex>
                  )}
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Layout>
  );
}