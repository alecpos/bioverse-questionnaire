import React, { useState, useRef } from 'react';
import { 
  Button, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalCloseButton,
  FormControl, 
  FormLabel, 
  FormHelperText,
  Input,
  useDisclosure,
  Box,
  VStack,
  useToast,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Checkbox
} from '@chakra-ui/react';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

// Define interfaces for CSV data
interface QuestionnaireCSV {
  id: string;
  name: string;
  description: string;
}

interface QuestionCSV {
  id?: string;
  question_id?: string; // Support for alternative field name
  text?: string;
  question_text?: string; // Support for alternative field name
  type?: string;
  question_type?: string; // Support for alternative field name
  options?: string;
  question?: string; // For JSON-formatted question data in a 'question' column
  parsed_question?: {
    type?: string;
    question_text?: string;
    question?: string; // Direct question text
    options?: string[] | any;
  }; // For storing parsed JSON data
}

interface JunctionCSV {
  questionnaire_id: string;
  question_id: string;
  priority: string;
}

const ImportQuestionnaires: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [questionnairesFile, setQuestionnairesFile] = useState<File | null>(null);
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [junctionsFile, setJunctionsFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [parsedData, setParsedData] = useState<{
    questionnaires?: any[];
    questions?: any[];
    junctions?: any[];
  }>({});
  
  const questionnairesRef = useRef<HTMLInputElement>(null);
  const questionsRef = useRef<HTMLInputElement>(null);
  const junctionsRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleClose = () => {
    onClose();
    resetForm();
  };
  
  const resetForm = () => {
    setQuestionnairesFile(null);
    setQuestionsFile(null);
    setJunctionsFile(null);
    setValidationError(null);
    if (questionnairesRef.current) questionnairesRef.current.value = '';
    if (questionsRef.current) questionsRef.current.value = '';
    if (junctionsRef.current) junctionsRef.current.value = '';
  };

  // Helper function to read a File as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  };

  // Parse CSV content to array of objects
  const parseCSV = <T,>(content: string, fileName: string): T[] => {
    try {
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
      throw new Error(`Failed to parse ${fileName}: ${error}`);
    }
  };

  // Validate CSV data has required fields
  const validateQuestionnairesCSV = (data: any[]): boolean => {
    if (data.length === 0) {
      throw new Error('Questionnaires CSV contains no records');
    }
    
    for (const item of data) {
      if (!item.id && !item.questionnaire_id) {
        throw new Error('Questionnaires CSV is missing required ID field (id or questionnaire_id)');
      }
      if (!item.name && !item.questionnaire_name) {
        throw new Error('Questionnaires CSV is missing required name field (name or questionnaire_name)');
      }
      
      // Map fields if needed
      if (!item.id && item.questionnaire_id) item.id = item.questionnaire_id;
      if (!item.name && item.questionnaire_name) item.name = item.questionnaire_name;
      if (!item.description && item.questionnaire_description) item.description = item.questionnaire_description;
    }
    return true;
  };

  const validateQuestionsCSV = (data: any[]): boolean => {
    if (data.length === 0) {
      throw new Error('Questions CSV contains no records');
    }
    
    for (const item of data) {
      // First check if this is the JSON-in-CSV format from the screenshot
      if (item.question && typeof item.question === 'string') {
        try {
          // Try to parse the JSON string
          const questionData = JSON.parse(item.question);
          // Add the parsed data back to the item
          item.parsed_question = questionData;
          
          // Successfully parsed JSON, continue to next item
          continue;
        } catch (e) {
          console.warn(`Failed to parse question JSON: ${item.question}`, e);
          // Continue with regular validation
        }
      }
      
      // Standard format validation
      // Check for ID field in possible formats
      let hasId = item.id || item.question_id;
      // Check for text field in possible formats
      let hasText = item.text || item.question_text;
      // Check for type field in possible formats
      let hasType = item.type || item.question_type;
      
      if (!hasId) {
        throw new Error('Questions CSV is missing ID field (id or question_id)');
      }
      if (!hasText) {
        throw new Error('Questions CSV is missing text field (text or question_text)');
      }
      if (!hasType) {
        throw new Error('Questions CSV is missing type field (type or question_type)');
      }
      
      // Map fields if needed
      if (!item.id && item.question_id) item.id = item.question_id;
      if (!item.text && item.question_text) item.text = item.question_text;
      if (!item.type && item.question_type) item.type = item.question_type;
    }
    return true;
  };

  const validateJunctionsCSV = (data: any[], questionnaires: any[], questions: any[]): boolean => {
    if (data.length === 0) {
      throw new Error('Junctions CSV contains no records');
    }
    
    // Create sets of valid IDs for lookup
    const questionnaireIds = new Set(questionnaires.map(q => q.id?.toString()));
    const questionIds = new Set(questions.map(q => (q.id || q.question_id)?.toString()));
    
    for (const item of data) {
      // Check for questionnaire ID field
      const qId = item.questionnaire_id || item.questionnaireid || '';
      // Check for question ID field
      const questionId = item.question_id || item.questionid || '';
      // Check for priority field
      const priority = item.priority || item.order || item.sequence || '0';
      
      if (!qId) {
        throw new Error('Junctions CSV is missing questionnaire ID field (questionnaire_id)');
      }
      if (!questionId) {
        throw new Error('Junctions CSV is missing question ID field (question_id)');
      }
      
      // Standardize field names
      if (!item.questionnaire_id) item.questionnaire_id = qId;
      if (!item.question_id) item.question_id = questionId;
      if (!item.priority) item.priority = priority;
      
      // Relaxed validation - don't halt import for references to questions/questionnaires
      // that might be created during the import process
      if (!questionnaireIds.has(qId.toString())) {
        console.warn(`Junction references questionnaire ID ${qId} which isn't in the questionnaires CSV`);
      }
      
      if (!questionIds.has(questionId.toString())) {
        console.warn(`Junction references question ID ${questionId} which isn't in the questions CSV`);
      }
    }
    return true;
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (!questionnairesFile || !questionsFile || !junctionsFile) {
      setValidationError('Please select all three CSV files');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Read files as text
      const questionnairesContent = await readFileAsText(questionnairesFile);
      const questionsContent = await readFileAsText(questionsFile);
      const junctionsContent = await readFileAsText(junctionsFile);
      
      // Parse CSVs into objects
      const questionnaires = parseCSV<QuestionnaireCSV>(
        questionnairesContent, 
        questionnairesFile.name
      );
      const questions = parseCSV<QuestionCSV>(
        questionsContent,
        questionsFile.name
      );
      const junctions = parseCSV<JunctionCSV>(
        junctionsContent,
        junctionsFile.name
      );
      
      // Validate CSV data
      validateQuestionnairesCSV(questionnaires);
      validateQuestionsCSV(questions);
      validateJunctionsCSV(junctions, questionnaires, questions);
      
      console.log(`Parsed ${questionnaires.length} questionnaires, ${questions.length} questions, ${junctions.length} junctions`);
      
      // Create a map of question data
      const questionMap = new Map<string, any>();
      questions.forEach(question => {
        try {
          // Check if this is the JSON-in-CSV format
          if (question.parsed_question) {
            const parsedQ = question.parsed_question;
            const id = question.id || '';
            const text = parsedQ.question_text || parsedQ.question || '';
            const type = parsedQ.type || '';
            const options = parsedQ.options || undefined;
            
            questionMap.set(id, {
              id,
              text,
              type,
              options
            });
            return; // Skip the rest of processing for this question
          }
          
          // Another format: if there's a JSON string directly in the 'question' field
          if (question.question && typeof question.question === 'string' && question.question.trim().startsWith('{')) {
            try {
              const parsedContent = JSON.parse(question.question);
              const id = question.id || '';
              const text = parsedContent.question || '';
              const type = parsedContent.type || '';
              const options = parsedContent.options || undefined;
              
              questionMap.set(id, {
                id,
                text,
                type,
                options
              });
              return; // Skip the rest of processing for this question
            } catch (e) {
              console.warn('Failed to parse JSON in question field:', e);
              // Continue with standard format
            }
          }
          
          // Standard format processing
          const id = question.id || question.question_id || '';
          const text = question.text || question.question_text || '';
          const type = question.type || question.question_type || '';
          
          // Try to parse options if present
          let options = undefined;
          if (question.options) {
            try {
              options = JSON.parse(question.options);
            } catch (e) {
              // If not valid JSON, try treating as comma-separated list
              options = question.options.split(',').map(o => o.trim());
            }
          }
          
          questionMap.set(id, {
            id,
            text,
            type,
            options
          });
        } catch (error) {
          const id = question.id || question.question_id || 'unknown';
          throw new Error(`Error processing question ID ${id}: ${error}`);
        }
      });
      
      // Group junctions by questionnaire
      const questionnaireQuestions = new Map<string, Array<any>>();
      junctions.forEach(junction => {
        const { questionnaire_id, question_id, priority } = junction;
        if (!questionnaireQuestions.has(questionnaire_id)) {
          questionnaireQuestions.set(questionnaire_id, []);
        }
        
        const question = questionMap.get(question_id);
        if (question) {
          const questionWithPriority = {
            ...question,
            priority: parseInt(priority, 10) || 0
          };
          questionnaireQuestions.get(questionnaire_id)?.push(questionWithPriority);
        }
      });
      
      // Create final structured data with questions sorted by priority
      const structuredQuestionnaires = questionnaires.map(questionnaire => {
        const questions = questionnaireQuestions.get(questionnaire.id) || [];
        // Sort questions by priority
        questions.sort((a, b) => a.priority - b.priority);
        
        return {
          ...questionnaire,
          questions
        };
      });
      
      // Send to API
      const response = await axios.post('/api/admin/import-questionnaires', structuredQuestionnaires);
      
      toast({
        title: 'Import Successful',
        description: `Imported ${questionnaires.length} questionnaires with ${questions.length} total questions`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      handleClose();
    } catch (error: any) {
      console.error('Import error:', error);
      
      // Set validation error for display in the form
      setValidationError(error.message || 'Unknown error occurred');
      
      // Also show as toast for visibility
      toast({
        title: 'Import Failed',
        description: error.response?.data?.details || error.message || 'Unknown error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Preview CSV files to help with debugging
  const previewCSVFiles = async () => {
    setValidationError(null);
    
    if (!questionnairesFile || !questionsFile || !junctionsFile) {
      setValidationError('Please select all three CSV files to preview');
      return;
    }
    
    try {
      // Read files as text
      const questionnairesContent = await readFileAsText(questionnairesFile);
      const questionsContent = await readFileAsText(questionsFile);
      const junctionsContent = await readFileAsText(junctionsFile);
      
      // Parse CSVs into objects
      const questionnaires = parseCSV<QuestionnaireCSV>(
        questionnairesContent, 
        questionnairesFile.name
      );
      const questions = parseCSV<QuestionCSV>(
        questionsContent,
        questionsFile.name
      );
      const junctions = parseCSV<JunctionCSV>(
        junctionsContent,
        junctionsFile.name
      );
      
      // Set parsed data for preview
      setParsedData({
        questionnaires: questionnaires.slice(0, 5), // Show first 5 records
        questions: questions.slice(0, 5),
        junctions: junctions.slice(0, 5)
      });
      
      // Show success message
      toast({
        title: 'CSV Preview Ready',
        description: `Successfully parsed CSV files with ${questionnaires.length} questionnaires, ${questions.length} questions, and ${junctions.length} junctions`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      setValidationError(error.message || 'Failed to preview CSV files');
    }
  };

  return (
    <>
      <Button colorScheme="green" onClick={onOpen} mb={3} leftIcon={<span>📁</span>}>
        Import Questionnaires from CSV
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Import Questionnaires from CSV</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {validationError && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleImport}>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Questionnaires CSV</FormLabel>
                  <Input
                    type="file"
                    ref={questionnairesRef}
                    accept=".csv"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setQuestionnairesFile(e.target.files?.[0] || null)
                    }
                    required
                  />
                  <FormHelperText>Format: id,name,description</FormHelperText>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Questions CSV</FormLabel>
                  <Input
                    type="file"
                    ref={questionsRef}
                    accept=".csv"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setQuestionsFile(e.target.files?.[0] || null)
                    }
                    required
                  />
                  <FormHelperText>Format: id,text,type,options</FormHelperText>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Junction CSV</FormLabel>
                  <Input
                    type="file"
                    ref={junctionsRef}
                    accept=".csv"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setJunctionsFile(e.target.files?.[0] || null)
                    }
                    required
                  />
                  <FormHelperText>Format: questionnaire_id,question_id,priority</FormHelperText>
                </FormControl>
                
                <Checkbox 
                  isChecked={debugMode} 
                  onChange={(e) => setDebugMode(e.target.checked)}
                  colorScheme="blue"
                  mb={2}
                >
                  Enable debug mode
                </Checkbox>
                
                {debugMode && (
                  <Button 
                    colorScheme="purple" 
                    variant="outline" 
                    onClick={previewCSVFiles}
                    mb={3}
                  >
                    Preview CSV Contents
                  </Button>
                )}
                
                {debugMode && parsedData.questionnaires && (
                  <Accordion allowToggle mb={4}>
                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Questionnaires Preview
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Code p={2} display="block" whiteSpace="pre" overflowX="auto">
                          {JSON.stringify(parsedData.questionnaires, null, 2)}
                        </Code>
                      </AccordionPanel>
                    </AccordionItem>
                    
                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Questions Preview
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Code p={2} display="block" whiteSpace="pre" overflowX="auto">
                          {JSON.stringify(parsedData.questions, null, 2)}
                        </Code>
                      </AccordionPanel>
                    </AccordionItem>
                    
                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Junctions Preview
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Code p={2} display="block" whiteSpace="pre" overflowX="auto">
                          {JSON.stringify(parsedData.junctions, null, 2)}
                        </Code>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                )}
                
                <Box>
                  <Button 
                    colorScheme="blue" 
                    type="submit" 
                    width="100%"
                    isDisabled={isLoading || !questionnairesFile || !questionsFile || !junctionsFile}
                    isLoading={isLoading}
                    loadingText="Importing..."
                  >
                    Import Questionnaires
                  </Button>
                </Box>
              </VStack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ImportQuestionnaires; 