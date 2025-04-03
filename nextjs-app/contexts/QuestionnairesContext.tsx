import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';
import { useAuth } from './AuthContext';
import Cookies from 'js-cookie';

// Types
interface Questionnaire {
  id: number;
  name: string;
  description: string;
}

interface CompletedQuestionnaire {
  id: number;
  name: string;
  completed_at: string;
  timezone_name?: string;
  timezone_offset?: string;
}

interface QuestionnairesContextType {
  questionnaires: Questionnaire[];
  completedQuestionnaires: CompletedQuestionnaire[];
  isLoading: boolean;
  error: string | null;
  refetchQuestionnaires: () => Promise<void>;
}

// Create context with default values
const QuestionnairesContext = createContext<QuestionnairesContextType | undefined>(undefined);

// Provider component
export const QuestionnairesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [completedQuestionnaires, setCompletedQuestionnaires] = useState<CompletedQuestionnaire[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Debug logging
  console.log('QuestionnairesProvider state:', { 
    isLoggedIn, 
    userId: user?.id,
    questionnairesCount: questionnaires.length,
    completedCount: completedQuestionnaires.length,
    path: router.pathname
  });
  
  // Wrap fetchQuestionnaires in useCallback to maintain its reference
  const fetchQuestionnaires = useCallback(async () => {
    if (!isLoggedIn || !user) {
      console.log('User not logged in, skipping questionnaire fetch');
      setQuestionnaires([]);
      setCompletedQuestionnaires([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching questionnaires...');
      
      // Fetch all questionnaires
      const questionnairesResponse = await axios.get('/api/questionnaires');
      const questionnairesData = questionnairesResponse.data;
      
      // Fetch completed questionnaires for the current user
      let completedData: CompletedQuestionnaire[] = [];
      try {
        console.log(`Fetching completed questionnaires for user ID ${user.id}...`);
        
        // Explicitly use the logged-in user's ID in the request
        const userId = user.id;
        const completedResponse = await axios.get(`/api/responses/user/${userId}/completed`);
        
        // API now returns the array directly, not nested in an object
        completedData = completedResponse.data;
        
        // Validate the returned data format and structure
        if (Array.isArray(completedData)) {
          // Check each item has the expected properties
          completedData = completedData.filter(item => {
            const valid = item && typeof item === 'object' && 
                        'id' in item && 
                        'name' in item && 
                        'completed_at' in item;
            
            if (!valid) {
              console.warn('Invalid completion item:', item);
            }
            
            return valid;
          });
          
          // Convert string IDs to numbers if needed
          completedData = completedData.map(item => ({
            ...item,
            id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
            timezone_name: item.timezone_name || undefined,
            timezone_offset: item.timezone_offset || undefined
          }));
          
          // Log the timezone information for debugging
          if (completedData.length > 0) {
            console.log('Complete timestamp debug information:');
            completedData.forEach((item, index) => {
              console.log(`Completion #${index + 1}:`);
              console.log('- id:', item.id);
              console.log('- name:', item.name);
              console.log('- completed_at:', item.completed_at);
              console.log('- timezone_name:', item.timezone_name || 'not provided');
              console.log('- timezone_offset:', item.timezone_offset || 'not provided');
              console.log('- raw date object:', new Date(item.completed_at).toString());
              console.log('- ISO string:', new Date(item.completed_at).toISOString());
              console.log('----------------------------');
            });
          }
        } else {
          console.error('Completed questionnaires data is not an array:', completedData);
          completedData = [];
        }
      } catch (error) {
        console.error('Error fetching completed questionnaires:', error);
        completedData = [];
      }
      
      // Update state with fetched data
      setQuestionnaires(questionnairesData);
      setCompletedQuestionnaires(completedData);
      
      // Log what we got for debugging
      console.log(`Fetched ${questionnairesData.length} questionnaires and ${completedData.length} completed questionnaires`);
      
    } catch (error) {
      console.error('Error fetching questionnaires data:', error);
      setError('Failed to load questionnaires');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user]);
  
  // Fetch questionnaires when the user logs in or changes
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchQuestionnaires();
    } else {
      // Clear data when user logs out
      setQuestionnaires([]);
      setCompletedQuestionnaires([]);
      setIsLoading(false);
    }
  }, [isLoggedIn, user, fetchQuestionnaires]); // fetchQuestionnaires is stable now
  
  // Context value
  const contextValue: QuestionnairesContextType = {
    questionnaires,
    completedQuestionnaires,
    isLoading,
    error,
    refetchQuestionnaires: fetchQuestionnaires,
  };
  
  return (
    <QuestionnairesContext.Provider value={contextValue}>
      {children}
    </QuestionnairesContext.Provider>
  );
};

// Custom hook for using questionnaires context
export const useQuestionnaires = () => {
  const context = useContext(QuestionnairesContext);
  if (!context) {
    throw new Error('useQuestionnaires must be used within a QuestionnairesProvider');
  }
  return context;
}; 