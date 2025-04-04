import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Progress,
  Stack,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { sanitizeInput } from '../utils/validation';

export interface Question {
  id: number;
  text: string;
  type: 'multiple_choice' | 'text_input';
  options?: string[];
  priority: number;
}

export interface Questionnaire {
  id: number;
  title: string;
  questions: Question[];
}

export interface UserAnswers {
  [questionId: number]: string | string[];
}

interface QuestionnaireViewProps {
  questionnaire: Questionnaire;
  userAnswers: UserAnswers;
  onSave: (answers: UserAnswers) => void;
}

const QuestionnaireView: React.FC<QuestionnaireViewProps> = ({
  questionnaire,
  userAnswers,
  onSave,
}) => {
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [progress, setProgress] = useState<number>(0);

  const calculateProgress = useCallback((currentAnswers: UserAnswers) => {
    if (!questionnaire?.questions?.length) return 0;
    
    const totalQuestions = questionnaire.questions.length;
    const answeredQuestions = questionnaire.questions.filter(q => {
      const answer = currentAnswers[q.id];
      if (!answer) return false;
      
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      
      return (answer as string).trim() !== '';
    }).length;
    
    const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100);
    setProgress(progressPercentage);
    return progressPercentage;
  }, [questionnaire]);

  useEffect(() => {
    // Initialize with provided answers
    setAnswers(userAnswers || {});
    
    // Calculate initial progress
    calculateProgress(userAnswers);
  }, [userAnswers, calculateProgress]);

  const handleMultipleChoiceChange = (questionId: number, option: string, checked: boolean) => {
    const currentAnswers = answers[questionId] || [];
    let newAnswers: string[] = [];
    
    if (Array.isArray(currentAnswers)) {
      newAnswers = [...currentAnswers];
    }
    
    if (checked) {
      if (!newAnswers.includes(option)) {
        newAnswers.push(option);
      }
    } else {
      newAnswers = newAnswers.filter(item => item !== option);
    }
    
    const updatedAnswers = { ...answers, [questionId]: newAnswers };
    setAnswers(updatedAnswers);
    calculateProgress(updatedAnswers);
  };

  const handleTextInputChange = (questionId: number, value: string) => {
    const sanitizedValue = sanitizeInput(value);
    const updatedAnswers = { ...answers, [questionId]: sanitizedValue };
    setAnswers(updatedAnswers);
    calculateProgress(updatedAnswers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(answers);
  };

  const renderQuestion = (question: Question) => {
    const { id, text, type, options } = question;
    
    if (type === 'multiple_choice' && options?.length) {
      return (
        <FormControl key={id} mb={6}>
          <FormLabel fontWeight="bold">{text}</FormLabel>
          <Stack spacing={2}>
            {options.map((option, index) => {
              const answer = answers[id] || [];
              const isChecked = Array.isArray(answer) && answer.includes(option);
              
              return (
                <Checkbox
                  key={index}
                  isChecked={isChecked}
                  onChange={(e) => handleMultipleChoiceChange(id, option, e.target.checked)}
                >
                  {option}
                </Checkbox>
              );
            })}
          </Stack>
        </FormControl>
      );
    }
    
    if (type === 'text_input') {
      const answer = answers[id] || '';
      
      return (
        <FormControl key={id} mb={6}>
          <FormLabel fontWeight="bold">{text}</FormLabel>
          <Textarea
            value={answer as string}
            onChange={(e) => handleTextInputChange(id, e.target.value)}
            placeholder="Enter your answer here"
          />
        </FormControl>
      );
    }
    
    return null;
  };

  // Sort questions by priority if available
  const sortedQuestions = [...questionnaire.questions].sort((a, b) => 
    (a.priority || 0) - (b.priority || 0)
  );

  return (
    <Box p={4} bg="white" borderRadius="md" shadow="md">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="lg">{questionnaire.title}</Heading>
        
        <Box mb={6}>
          <Text fontSize="sm" mb={2}>Progress: {progress}%</Text>
          <Progress value={progress} size="sm" colorScheme="blue" role="progressbar" aria-valuenow={progress} />
        </Box>
        
        <form onSubmit={handleSubmit}>
          {sortedQuestions.map(renderQuestion)}
          
          <Button
            mt={6}
            colorScheme="blue"
            type="submit"
            width="full"
          >
            Save Answers
          </Button>
        </form>
      </VStack>
    </Box>
  );
};

export default QuestionnaireView; 