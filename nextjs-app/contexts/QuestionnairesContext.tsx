import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useTransition } from 'react';
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
  
  // Add useTransition to defer state updates
  const [isPending, startTransition] = useTransition();
  
  // Track last data fetch time to avoid too frequent refetches
  const lastFetchRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  
  // Use ref to track previous data for comparison
  const prevDataRef = useRef<{
    questionnaires: Questionnaire[];
    completedQuestionnaires: CompletedQuestionnaire[];
  }>({
    questionnaires: [],
    completedQuestionnaires: []
  });
  
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  
  // Wrap fetchQuestionnaires in useCallback to maintain its reference
  const fetchQuestionnaires = useCallback(async (force: boolean = false) => {
    if (!isLoggedIn || !user) {
      setQuestionnaires([]);
      setCompletedQuestionnaires([]);
      setIsLoading(false);
      return;
    }

    // Check if we're already fetching and not forcing a new fetch
    if (isFetchingRef.current && !force) {
      console.log('Skipping fetch - already fetching data');
      return;
    }
    
    // Prevent excessive refetches within short periods (unless forced)
    const now = Date.now();
    const FETCH_THROTTLE = 2000; // 2 seconds between fetches
    if (!force && now - lastFetchRef.current < FETCH_THROTTLE) {
      // If within throttle window, schedule a fetch for later instead of doing it now
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        fetchQuestionnaires(true);
      }, FETCH_THROTTLE - (now - lastFetchRef.current));
      
      return;
    }
    
    // Mark fetching has started
    isFetchingRef.current = true;
    lastFetchRef.current = now;
    
    // Only set loading state if we don't have data yet
    if (questionnaires.length === 0) {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      // Fetch all questionnaires and completed questionnaires in parallel
      const [questionnairesResponse, completedResponse] = await Promise.all([
        axios.get('/api/questionnaires'),
        // Explicitly use the logged-in user's ID in the request
        axios.get(`/api/responses/user/${user.id}/completed`).catch(err => {
          console.error('Error fetching completed questionnaires:', err);
          return { data: [] };
        })
      ]);
      
      const questionnairesData = questionnairesResponse.data;
      
      // Process completed questionnaires data
      let completedData: CompletedQuestionnaire[] = [];
      
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
      } else {
        console.error('Completed questionnaires data is not an array:', completedData);
        completedData = [];
      }
      
      // Check if data is actually different before updating state
      const questionnaireDataChanged = JSON.stringify(prevDataRef.current.questionnaires) !== JSON.stringify(questionnairesData);
      const completedDataChanged = JSON.stringify(prevDataRef.current.completedQuestionnaires) !== JSON.stringify(completedData);
      
      // Only update state if data has changed
      if (questionnaireDataChanged || completedDataChanged) {
        // Use startTransition to defer the state update
        startTransition(() => {
          // Batch state updates to reduce renders
          // React 18 automatically batches updates, but we're explicit for clarity
          // and to ensure they happen in one render cycle
          const updates: (() => void)[] = [];
          
          if (questionnaireDataChanged) {
            updates.push(() => {
              setQuestionnaires(questionnairesData);
              prevDataRef.current.questionnaires = questionnairesData;
            });
          }
          
          if (completedDataChanged) {
            updates.push(() => {
              setCompletedQuestionnaires(completedData);
              prevDataRef.current.completedQuestionnaires = completedData;
            });
          }
          
          // Execute all the updates in sequence
          updates.forEach(update => update());
        });
      }
    } catch (error) {
      console.error('Error fetching questionnaires data:', error);
      setError('Failed to load questionnaires');
    } finally {
      // Mark fetching as complete
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  // questionnaires.length intentionally omitted from dependencies to prevent infinite fetch loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);
  
  // Fetch questionnaires when the user logs in or changes
  useEffect(() => {
    // Mark component as mounted on first render
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      
      // Only fetch on mount if user is logged in
      if (isLoggedIn && user) {
        fetchQuestionnaires();
      } else {
        // Clear data when mounting without a user
        setQuestionnaires([]);
        setCompletedQuestionnaires([]);
        setIsLoading(false);
      }
      return;
    }
    
    // For subsequent renders, only fetch if user or login state changed
    // This prevents constant refetching
    if (isLoggedIn && user) {
      fetchQuestionnaires();
    } else {
      // Clear data when user logs out
      setQuestionnaires([]);
      setCompletedQuestionnaires([]);
      setIsLoading(false);
    }
  }, [isLoggedIn, user, fetchQuestionnaires]);
  
  // Context value - memoize to prevent unnecessary rerenders
  const contextValue = React.useMemo(() => ({
    questionnaires,
    completedQuestionnaires,
    isLoading: isLoading || isPending, // Include transition pending state
    error,
    refetchQuestionnaires: () => fetchQuestionnaires(true), // Force refresh when called explicitly
  }), [questionnaires, completedQuestionnaires, isLoading, isPending, error, fetchQuestionnaires]);
  
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