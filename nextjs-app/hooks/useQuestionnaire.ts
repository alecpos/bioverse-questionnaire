import { useState, useEffect } from 'react';
import { Questionnaire, UserAnswers } from '../components/QuestionnaireView';
import { fetchQuestionnaire, fetchUserAnswers, saveAnswers as apiSaveAnswers } from '../lib/api';

interface UseQuestionnaireReturn {
  questionnaire: Questionnaire | null;
  userAnswers: UserAnswers;
  loading: boolean;
  error: string | null;
  progress: number;
  saveAnswers: (answers: UserAnswers) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Custom hook for managing questionnaire data and user answers
 * @param questionnaireId ID of the questionnaire to fetch
 */
export const useQuestionnaire = (questionnaireId: number): UseQuestionnaireReturn => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Fetch questionnaire and user answers data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch questionnaire data
        const questionnaireData = await fetchQuestionnaire(questionnaireId);
        setQuestionnaire(questionnaireData);
        
        // Fetch user's previous answers for this questionnaire
        const userAnswersData = await fetchUserAnswers(questionnaireId);
        setUserAnswers(userAnswersData);
        
        // Calculate progress based on fetched data
        calculateProgress(userAnswersData, questionnaireData);
        
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch questionnaire');
        setLoading(false);
      }
    };

    if (questionnaireId) {
      fetchData();
    }
  }, [questionnaireId]);

  /**
   * Calculates the progress percentage based on completed questions
   */
  const calculateProgress = (answers: UserAnswers, questionnaireData?: Questionnaire | null) => {
    const data = questionnaireData || questionnaire;
    if (!data?.questions?.length) {
      setProgress(0);
      return 0;
    }
    
    const totalQuestions = data.questions.length;
    let answeredQuestions = 0;
    
    // Check each question to see if it has an answer
    data.questions.forEach(question => {
      const answer = answers[question.id];
      let isAnswered = false;
      
      if (answer !== undefined && answer !== null) {
        if (Array.isArray(answer)) {
          isAnswered = answer.length > 0;
        } else if (typeof answer === 'string') {
          isAnswered = answer.trim() !== '';
        } else {
          isAnswered = true;
        }
      }
      
      if (isAnswered) {
        answeredQuestions += 1;
      }
    });
    
    const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100);
    setProgress(progressPercentage);
    return progressPercentage;
  };

  /**
   * Save user answers to the server and update local state
   */
  const saveAnswers = async (answers: UserAnswers) => {
    try {
      setError(null);
      
      // Call API to save answers
      await apiSaveAnswers(questionnaireId, answers);
      
      // Update local state
      setUserAnswers(answers);
      
      // Recalculate progress
      const newProgress = calculateProgress(answers);
      
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Failed to save answers');
      return { success: false, error: err.message };
    }
  };

  return {
    questionnaire,
    userAnswers,
    loading,
    error,
    progress,
    saveAnswers
  };
};

export default useQuestionnaire; 