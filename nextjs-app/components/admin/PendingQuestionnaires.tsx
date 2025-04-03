import React, { useState } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Badge,
  useColorModeValue,
  HStack,
  useToast,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Flex,
  Tooltip,
  ListItem,
  UnorderedList,
  Code,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Checkbox,
} from '@chakra-ui/react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { showToast } from '../../utils/toastManager';
import { InfoIcon, RepeatIcon, WarningIcon } from '@chakra-ui/icons';

interface PendingQuestionnaire {
  id: number;
  name: string;
  is_pending: boolean;
  description?: string;
}

interface SimilarQuestionnaire {
  importName: string;
  existingName: string;
  existingId: number;
}

interface PendingQuestionnairesProps {
  questionnaires: PendingQuestionnaire[];
  similarQuestionnaires?: SimilarQuestionnaire[];
  onUpdate: () => void;
}

const PendingQuestionnaires: React.FC<PendingQuestionnairesProps> = ({ 
  questionnaires, 
  similarQuestionnaires, 
  onUpdate 
}) => {
  const [approvingQuestionnaire, setApprovingQuestionnaire] = useState<number | null>(null);
  const [rejectingQuestionnaire, setRejectingQuestionnaire] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewQuestionnaire, setPreviewQuestionnaire] = useState<PendingQuestionnaire | null>(null);
  const [questionnaireDetails, setQuestionnaireDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);
  const [resettingQuestionnaire, setResettingQuestionnaire] = useState<number | null>(null);
  const [preserveResponses, setPreserveResponses] = useState<boolean>(true);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<PendingQuestionnaire | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const toast = useToast();
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('white', 'gray.800');
  const infoBackground = useColorModeValue('blue.50', 'blue.900');
  
  const pendingQuestionnaires = questionnaires.filter(q => q.is_pending);
  
  if (pendingQuestionnaires.length === 0 && !similarQuestionnaires?.length) {
    return null;
  }
  
  const handleApproveQuestionnaire = async (questionnaireId: number, approve: boolean) => {
    setError(null);
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
        onUpdate();
        
        // Close modal if open
        if (previewQuestionnaire?.id === questionnaireId) {
          setPreviewQuestionnaire(null);
        }
      }
    } catch (error: any) {
      console.error('Error approving/rejecting questionnaire:', error);
      setError(error.response?.data?.error || 'Failed to process request');
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
  
  const fetchQuestionnaireDetails = async (questionnaire: PendingQuestionnaire) => {
    if (!questionnaire || !questionnaire.id) return;
    
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/questionnaire/${questionnaire.id}`, {
        headers: {
          Authorization: `Bearer ${Cookies.get('token')}`
        }
      });
      
      setQuestionnaireDetails(data);
      setPreviewQuestionnaire(questionnaire);
    } catch (error: any) {
      console.error('Error fetching questionnaire details:', error);
      showToast(toast, {
        title: 'Error',
        description: 'Failed to load questionnaire details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClosePreview = () => {
    if (approvingQuestionnaire !== null || rejectingQuestionnaire !== null) return;
    setPreviewQuestionnaire(null);
    setQuestionnaireDetails(null);
  };
  
  const handleResetQuestionnaire = async (questionnaire: PendingQuestionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setIsResetDialogOpen(true);
  };
  
  const confirmReset = async () => {
    if (!selectedQuestionnaire) return;
    
    setResettingQuestionnaire(selectedQuestionnaire.id);
    try {
      const response = await axios.post(
        '/api/admin/reset-questionnaire',
        { 
          questionnaire_id: selectedQuestionnaire.id,
          preserve_responses: preserveResponses 
        },
        {
          headers: {
            Authorization: `Bearer ${Cookies.get('token')}`
          }
        }
      );
      
      if (response.data.success) {
        showToast(toast, {
          title: 'Questionnaire Reset',
          description: response.data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error resetting questionnaire:', error);
      setError(error.response?.data?.error || 'Failed to reset questionnaire');
      showToast(toast, {
        title: 'Reset Failed',
        description: error.response?.data?.error || 'Failed to reset questionnaire',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setResettingQuestionnaire(null);
      setIsResetDialogOpen(false);
      setSelectedQuestionnaire(null);
    }
  };
  
  const formatQuestionnaireName = (questionnaire: PendingQuestionnaire) => {
    const isUpdate = questionnaire.id < 0;
    const nameDisplay = questionnaire.name.replace(' (PENDING UPDATE)', '');
    
    return (
      <Flex align="center">
        {nameDisplay}
        {isUpdate && (
          <Tooltip label={`This is an update to existing questionnaire ID ${Math.abs(questionnaire.id)}`}>
            <InfoIcon ml={2} color="blue.500" />
          </Tooltip>
        )}
      </Flex>
    );
  };
  
  return (
    <Box mt={8}>
      {similarQuestionnaires && similarQuestionnaires.length > 0 && (
        <Alert status="warning" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Found similar questionnaires:</Text>
            <UnorderedList mt={2}>
              {similarQuestionnaires.map((item, index) => (
                <ListItem key={index}>
                  "{item.importName}" is similar to existing "{item.existingName}" (ID: {item.existingId})
                </ListItem>
              ))}
            </UnorderedList>
          </Box>
        </Alert>
      )}
      
      {pendingQuestionnaires.length > 0 && (
        <Box
          p={6}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <Heading size="md" mb={4} color={headingColor}>
            Pending Questionnaires 
            <Badge ml={2} colorScheme="yellow">
              {pendingQuestionnaires.length}
            </Badge>
          </Heading>
          
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <Table variant="simple" size="md">
            <Thead bg={tableHeaderBg}>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pendingQuestionnaires.map(questionnaire => (
                <Tr key={questionnaire.id}>
                  <Td>{formatQuestionnaireName(questionnaire)}</Td>
                  <Td>
                    <Badge colorScheme="yellow">Pending</Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => fetchQuestionnaireDetails(questionnaire)}
                        isLoading={isLoading && previewQuestionnaire?.id === questionnaire.id}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => previewQuestionnaire && handleApproveQuestionnaire(previewQuestionnaire.id, true)}
                        isLoading={approvingQuestionnaire === previewQuestionnaire?.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={() => previewQuestionnaire && handleApproveQuestionnaire(previewQuestionnaire.id, false)}
                        isLoading={rejectingQuestionnaire === previewQuestionnaire?.id}
                      >
                        Reject
                      </Button>
                      <Tooltip label="Reset questionnaire structure">
                        <Button
                          size="sm"
                          colorScheme="orange"
                          isLoading={resettingQuestionnaire === questionnaire.id}
                          onClick={() => handleResetQuestionnaire(questionnaire)}
                          leftIcon={<RepeatIcon />}
                        >
                          Reset
                        </Button>
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
      
      {previewQuestionnaire && (
        <Modal isOpen={previewQuestionnaire !== null} onClose={handleClosePreview} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              Questionnaire Preview: {previewQuestionnaire?.name}
              {previewQuestionnaire?.id < 0 && (
                <Badge ml={2} colorScheme="blue">Update</Badge>
              )}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {!questionnaireDetails ? (
                <Flex justify="center" py={4}>
                  <Text>Loading questionnaire details...</Text>
                </Flex>
              ) : (
                <Box>
                  <Text fontWeight="bold" mb={2}>Description:</Text>
                  <Text mb={4}>{previewQuestionnaire?.description || 'No description provided'}</Text>
                  
                  <Text fontWeight="bold" mb={2}>Questions:</Text>
                  <Accordion allowMultiple>
                    {questionnaireDetails.questions?.map((question: any, index: number) => (
                      <AccordionItem key={question.id} mb={2} border="1px" borderColor={borderColor} borderRadius="md">
                        <h2>
                          <AccordionButton _expanded={{ bg: infoBackground }}>
                            <Box flex="1" textAlign="left">
                              <Text fontWeight="medium">
                                {index + 1}. {question.text?.substring(0, 60)}{question.text?.length > 60 ? '...' : ''}
                              </Text>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          <Text mb={2}>Full Text: {question.text}</Text>
                          <Text mb={2}>Type: <Badge>{question.type}</Badge></Text>
                          <Text mb={2}>Priority: {question.priority || 0}</Text>
                          
                          {question.options && (
                            <Box mt={3}>
                              <Text fontWeight="bold" mb={1}>Options:</Text>
                              <Code p={2} borderRadius="md" width="100%">
                                {typeof question.options === 'string' 
                                  ? question.options 
                                  : JSON.stringify(question.options, null, 2)}
                              </Code>
                            </Box>
                          )}
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Box>
              )}
            </ModalBody>
            <ModalFooter>
              <Button 
                colorScheme="green" 
                onClick={() => previewQuestionnaire?.id && handleApproveQuestionnaire(previewQuestionnaire.id, true)} 
                isLoading={approvingQuestionnaire === previewQuestionnaire?.id}
              >
                Approve
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => previewQuestionnaire?.id && handleApproveQuestionnaire(previewQuestionnaire.id, false)}
                isLoading={rejectingQuestionnaire === previewQuestionnaire?.id}
              >
                Reject
              </Button>
              <Button variant="ghost" onClick={handleClosePreview}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      
      <AlertDialog
        isOpen={isResetDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsResetDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Reset Questionnaire Structure
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text>Are you sure you want to reset the questionnaire &ldquo;{selectedQuestionnaire?.name}&rdquo;?</Text>
              <Text mt={4}>This will:</Text>
              <UnorderedList mt={2}>
                <ListItem>Remove all questions from this questionnaire</ListItem>
                <ListItem>Allow you to re-import the questionnaire with a fresh CSV</ListItem>
              </UnorderedList>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                colorScheme="orange" 
                onClick={confirmReset} 
                ml={3}
                isLoading={resettingQuestionnaire !== null}
              >
                Reset Structure
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PendingQuestionnaires; 