import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  useToast,
  Divider,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  useColorModeValue,
  HStack,
  Select,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { formatLocalDateTime } from '../../../utils/dateUtils';
import Layout from '../../../components/Layout';
import { adminDeleteResponses } from '../../../lib/api';

interface User {
  id: number;
  username: string;
  email: string;
}

interface CompletedQuestionnaire {
  id: number;
  name: string;
  completed_at: string;
  timezone_name?: string;
  timezone_offset?: string;
}

interface UserResponse {
  questionnaire_id: number;
  questionnaire_name: string;
  question_id: number;
  question_text: string;
  question_type: string;
  response_text: string | string[];
  created_at: string;
  timezone_name?: string;
  timezone_offset?: string;
}

export default function UserResponsesPage() {
  const router = useRouter();
  const { userId } = router.query;
  
  const [user, setUser] = useState<User | null>(null);
  const [completedQuestionnaires, setCompletedQuestionnaires] = useState<CompletedQuestionnaire[]>([]);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<CompletedQuestionnaire | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Pagination state for questionnaires
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  
  // Fetch user data and responses
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || typeof userId !== 'string') return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`/api/admin/user-responses/${userId}`);
        const { user, completedQuestionnaires, responses } = response.data;
        
        setUser(user);
        setCompletedQuestionnaires(completedQuestionnaires || []);
        setResponses(responses || []);
      } catch (err: any) {
        console.error('Error fetching user response data:', err);
        setError(err.response?.data?.error || 'Failed to load user data');
        
        toast({
          title: 'Error loading user data',
          description: err.response?.data?.error || 'Please try again later',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, toast]);
  
  // Handle deleting a user's questionnaire responses
  const handleDeleteResponses = async () => {
    if (!userId || !selectedQuestionnaire) return;
    
    setIsDeleting(true);
    
    try {
      const userIdNum = parseInt(userId as string);
      const questionnaireId = selectedQuestionnaire.id;
      
      console.log(`Admin is deleting responses for user ${userIdNum}, questionnaire ${questionnaireId}`);
      
      const result = await adminDeleteResponses(userIdNum, questionnaireId);
      
      if (result.success) {
        toast({
          title: 'Responses deleted',
          description: `Responses for ${selectedQuestionnaire.name} have been successfully deleted. ${result.stats ? `(${result.stats.responsesDeleted} responses, ${result.stats.completionsDeleted} completion records)` : ''}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Remove the deleted questionnaire from the list
        setCompletedQuestionnaires(prev => 
          prev.filter(q => q.id !== selectedQuestionnaire.id)
        );
        
        // Remove any responses for this questionnaire
        setResponses(prev => 
          prev.filter(r => r.questionnaire_id !== selectedQuestionnaire.id)
        );
        
        onClose();
      } else {
        throw new Error(result.error || 'Failed to delete responses');
      }
    } catch (err: any) {
      console.error('Error deleting responses:', err);
      toast({
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

  // Group responses by questionnaire
  const responsesByQuestionnaire = responses.reduce((groups, response) => {
    const key = response.questionnaire_id;
    if (!groups[key]) {
      groups[key] = {
        id: response.questionnaire_id,
        name: response.questionnaire_name,
        responses: [],
        latestResponse: null
      };
    }
    
    // Add response to the group
    groups[key].responses.push(response);
    
    // Track the latest response date
    const responseDate = new Date(response.created_at);
    if (!groups[key].latestResponse || responseDate > new Date(groups[key].latestResponse)) {
      groups[key].latestResponse = response.created_at;
    }
    
    return groups;
  }, {} as Record<number, { id: number; name: string; responses: UserResponse[]; latestResponse: string | null }>);
  
  // Format a response for display
  const formatResponse = (response: UserResponse) => {
    if (response.question_type === 'multiple_choice' && Array.isArray(response.response_text)) {
      return (
        <Box>
          {response.response_text.map((option, i) => (
            <Badge key={i} colorScheme="blue" mr={2} mb={2}>
              {option}
            </Badge>
          ))}
        </Box>
      );
    }
    
    return <Text>{response.response_text as string}</Text>;
  };
  
  // Format date for display
  const formatDate = (dateString: string, tzName?: string, tzOffset?: string) => {
    return formatLocalDateTime(
      dateString,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      },
      tzName,
      tzOffset
    );
  };
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  
  // Convert the responsesByQuestionnaire object to an array for pagination
  const questionnairesArray = Object.values(responsesByQuestionnaire);
  
  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentQuestionnaires = questionnairesArray.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(questionnairesArray.length / itemsPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  return (
    <Layout requireAuth adminOnly>
      <Container maxW="container.xl" py={8}>
        <Button 
          leftIcon={<ArrowBackIcon />}
          mb={6}
          onClick={() => router.push('/admin')}
          size="sm"
          variant="outline"
          colorScheme="blue"
        >
          Back to Dashboard
        </Button>
        
        {isLoading ? (
          <Flex justify="center" py={10}>
            <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          </Flex>
        ) : error ? (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        ) : !user ? (
          <Alert status="warning">
            <AlertIcon />
            User not found
          </Alert>
        ) : (
          <Box>
            <Card mb={8} bg={cardBg} boxShadow="md" borderRadius="lg">
              <CardHeader bg={headerBg} borderTopRadius="lg">
                <Heading size="md">User Information</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Box>
                    <Text fontWeight="bold">Username:</Text>
                    <Text>{user.username}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Email:</Text>
                    <Text>{user.email || 'Not provided'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Completed Questionnaires:</Text>
                    <Text>{completedQuestionnaires.length}</Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>
            
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Questionnaire Responses</Tab>
                <Tab>Completed Questionnaires</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Heading size="md" mb={4}>Questionnaire Responses</Heading>
                  
                  {Object.keys(responsesByQuestionnaire).length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      No questionnaire responses found for this user.
                    </Alert>
                  ) : (
                    <Box>
                      <Accordion allowMultiple defaultIndex={[0]}>
                        {Object.values(responsesByQuestionnaire).map((questionnaire) => (
                          <AccordionItem key={questionnaire.id}>
                            <h2>
                              <AccordionButton>
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="bold">{questionnaire.name}</Text>
                                  <Text fontSize="sm" color="gray.500">
                                    {questionnaire.responses.length} responses
                                  </Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                              {questionnaire.latestResponse && (
                                <Text fontSize="sm" color="gray.500" mb={3}>
                                  Submitted: {formatDate(questionnaire.latestResponse)}
                                </Text>
                              )}
                              {questionnaire.responses.map((response, i) => (
                                <Box key={i} mb={4} p={4} borderWidth="1px" borderRadius="md">
                                  <Text fontWeight="bold">{response.question_text}</Text>
                                  <Divider my={2} />
                                  <Text fontWeight="medium" mb={1} fontSize="sm" color="gray.500">
                                    Response:
                                  </Text>
                                  {formatResponse(response)}
                                </Box>
                              ))}
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      
                      {/* Pagination controls */}
                      {Object.values(responsesByQuestionnaire).length > itemsPerPage && (
                        <Flex justify="space-between" align="center" mt={6}>
                          <HStack spacing={2}>
                            <Text fontSize="sm">Show</Text>
                            <Select 
                              value={itemsPerPage} 
                              onChange={handleItemsPerPageChange} 
                              size="sm" 
                              width="70px"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
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
                              Page {currentPage} of {Math.ceil(Object.values(responsesByQuestionnaire).length / itemsPerPage)}
                            </Text>
                            
                            <IconButton
                              aria-label="Next page"
                              icon={<ChevronRightIcon />}
                              size="sm"
                              isDisabled={currentPage === Math.ceil(Object.values(responsesByQuestionnaire).length / itemsPerPage)}
                              onClick={() => paginate(currentPage + 1)}
                            />
                          </HStack>
                        </Flex>
                      )}
                    </Box>
                  )}
                </TabPanel>
                
                <TabPanel>
                  {completedQuestionnaires.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      No completed questionnaires found for this user.
                    </Alert>
                  ) : (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {completedQuestionnaires.map((questionnaire) => (
                        <Card key={questionnaire.id} boxShadow="sm" borderRadius="md">
                          <CardHeader pb={2}>
                            <Flex justify="space-between" align="center">
                              <Heading size="sm">{questionnaire.name}</Heading>
                              <HStack>
                                <CheckCircleIcon color="green.500" />
                                <IconButton
                                  aria-label="Delete responses"
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  variant="redOutline"
                                  onClick={() => {
                                    setSelectedQuestionnaire(questionnaire);
                                    onOpen();
                                  }}
                                />
                              </HStack>
                            </Flex>
                          </CardHeader>
                          <CardBody pt={0}>
                            <Text fontSize="sm" color="gray.500">
                              Completed on {formatDate(questionnaire.completed_at, questionnaire.timezone_name, questionnaire.timezone_offset)}
                            </Text>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        )}
      </Container>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Responses</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              <Text>
                Are you sure you want to delete all responses for {selectedQuestionnaire?.name}?
                This action cannot be undone.
              </Text>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleDeleteResponses}
              isLoading={isDeleting}
              leftIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
} 