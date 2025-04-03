import axios from 'axios';
import Cookies from 'js-cookie';
import { Questionnaire, UserAnswers } from '../components/QuestionnaireView';

// Define response types for better type safety
export interface QuestionnaireResponse {
  id: number;
  name: string;
  description: string;
  questions: {
    id: number;
    text: string;
    type: 'text' | 'multiple_choice';
    priority: number;
    options?: string[];
  }[];
}

export interface UserResponse {
  questionId: number;
  response: string | string[];
  type: 'text' | 'multiple_choice';
  fromOtherQuestionnaire?: boolean;
}

export interface PreviousResponsesData {
  hasResponses: boolean;
  hasCompletedQuestionnaire: boolean;
  questions: Array<{
    id: number;
    text: string;
    type: string;
    priority: number;
    answer: string | string[] | null;
  }>;
}

// Create axios instance with base URL and default configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use((config) => {
  // Try to get token from cookies first
  let token = Cookies.get('token');
  
  // If no token in cookies, try localStorage backup
  if (!token) {
    console.log('No token in cookies, checking localStorage backup');
    const backupToken = localStorage.getItem('bioverse_token_backup');
    
    if (backupToken) {
      console.log('Using backup token from localStorage');
      token = backupToken;
      
      // Restore token to cookies
      try {
        Cookies.set('token', backupToken, {
          expires: 1,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const
        });
        console.log('Restored token from backup to cookies');
      } catch (e) {
        console.warn('Failed to restore token to cookies:', e);
      }
    }
  }
  
  if (token) {
    console.log('Adding token to request headers');
    config.headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('No token available for request');
  }
  
  return config;
}, (error) => {
  console.error('API request interceptor error:', error);
  return Promise.reject(error);
});

/**
 * Fetches a questionnaire by its ID
 */
export async function fetchQuestionnaire(id: number): Promise<Questionnaire> {
  try {
    const response = await api.get(`/questionnaires/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching questionnaire:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch questionnaire');
  }
}

/**
 * Fetches user's previous answers for a questionnaire
 */
export async function fetchUserAnswers(questionnaireId: number): Promise<UserAnswers> {
  try {
    const response = await api.get(`/answers/${questionnaireId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user answers:', error);
    // Return empty object if no answers exist yet
    if (error.response?.status === 404) {
      return {};
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch answers');
  }
}

/**
 * Saves user answers for a questionnaire
 */
export async function saveAnswers(questionnaireId: number, answers: UserAnswers): Promise<{ success: boolean }> {
  try {
    const response = await api.post(`/answers/${questionnaireId}`, { answers });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving answers:', error);
    throw new Error(error.response?.data?.error || 'Failed to save answers');
  }
}

/**
 * Fetches all available questionnaires
 */
export async function fetchQuestionnaires(): Promise<Questionnaire[]> {
  try {
    const response = await api.get('/questionnaires');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching questionnaires:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch questionnaires');
  }
}

/**
 * Exports questionnaire responses to CSV
 */
export async function exportResponsesToCSV(questionnaireId: number) {
  try {
    const response = await api.get(`/export/${questionnaireId}`, {
      responseType: 'blob',
    });
    
    // Create a download link for the CSV file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `questionnaire_${questionnaireId}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error: any) {
    console.error('Error exporting responses:', error);
    throw new Error(error.response?.data?.error || 'Failed to export responses');
  }
}

/**
 * Fetches previous responses for a user and questionnaire
 */
export async function fetchPreviousResponses(userId: number, questionnaireId: number): Promise<PreviousResponsesData> {
  try {
    const response = await api.get(`/responses/user/${userId}/questionnaire/${questionnaireId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching previous responses:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch previous responses');
  }
}

/**
 * Submits user responses for a questionnaire
 */
export async function submitResponses(data: {
  questionnaireId: number;
  responses: { questionId: number; answer: string | string[] }[];
  timezone?: {
    name: string;
    offset: string;
  };
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await api.post('/responses/submit', data);
    return response.data;
  } catch (error: any) {
    console.error('Error submitting responses:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to submit responses'
    };
  }
}

/**
 * Deletes user responses for a specific questionnaire
 */
export async function deleteResponses(userId: number, questionnaireId: number): Promise<{ 
  success: boolean; 
  message?: string; 
  error?: string;
  stats?: {
    responsesDeleted: number;
    completionsDeleted: number;
  }
}> {
  try {
    const response = await api.delete('/responses/delete', {
      data: { userId, questionnaireId }
    });
    return { 
      success: true, 
      message: response.data.message,
      stats: response.data.stats
    };
  } catch (error: any) {
    console.error('Error deleting responses:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to delete responses' 
    };
  }
}

/**
 * Admin-only function to delete user responses for a specific questionnaire
 */
export async function adminDeleteResponses(userId: number, questionnaireId: number): Promise<{ 
  success: boolean; 
  message?: string; 
  error?: string;
  stats?: {
    responsesDeleted: number;
    completionsDeleted: number;
  }
}> {
  try {
    const response = await api.delete('/admin/delete-responses', {
      data: { userId, questionnaireId }
    });
    return { 
      success: true, 
      message: response.data.message,
      stats: response.data.stats
    };
  } catch (error: any) {
    console.error('Error deleting responses (admin):', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to delete responses' 
    };
  }
}

/**
 * Admin-only function to export questionnaire data as CSV
 */
export async function exportQuestionnaireToCsv(questionnaireId: number) {
  try {
    const response = await api.get(`/export/${questionnaireId}`, {
      responseType: 'blob',
    });
    
    // Create a download link for the CSV file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `questionnaire_${questionnaireId}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error: any) {
    console.error('Error exporting questionnaire data:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to export questionnaire data' 
    };
  }
}

const apiEndpoints = {
  // Questionnaire endpoints
  getQuestionnaires: () => 
    api.get('/questionnaires'),
  
  getQuestionnaireById: (id: string | number) => 
    api.get<QuestionnaireResponse>(`/questionnaires/${id}`),
  
  // User response endpoints
  getPreviousResponses: (userId: number, questionnaireId: string | number) => 
    api.get<PreviousResponsesData>(`/responses/user/${userId}/questionnaire/${questionnaireId}`),
  
  getCompletedQuestionnaires: (userId: number) => 
    api.get(`/responses/user/${userId}/completed`),
  
  submitResponses: (data: {
    questionnaireId: number;
    responses: { questionId: number; answer: string | string[] }[];
    timezone?: {
      name: string;
      offset: string;
    };
  }) => 
    api.post('/responses/submit', data),
  
  deleteResponses: (userId: number, questionnaireId: number) =>
    api.delete('/responses/delete', { data: { userId, questionnaireId } }),
  
  // Admin endpoints
  getUsers: () => 
    api.get('/admin/user-responses'),
  
  getUserResponses: (userId: number) => 
    api.get(`/admin/user-responses/${userId}`),
    
  adminDeleteResponses: (userId: number, questionnaireId: number) =>
    api.delete('/admin/delete-responses', { data: { userId, questionnaireId } }),
    
  exportQuestionnaireToCsv: (questionnaireId: number) =>
    api.get(`/export/${questionnaireId}`, { responseType: 'blob' }),
};

export default apiEndpoints; 