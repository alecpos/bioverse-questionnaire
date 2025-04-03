import React from 'react';
import {
  IconButton,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { exportQuestionnaireToCsv } from '../../lib/api';
import { showToast } from '../../utils/toastManager';

interface QuestionnaireActionsProps {
  questionnaire: {
    id: number;
    name: string;
  };
  onUpdate: () => void;
}

const QuestionnaireActions: React.FC<QuestionnaireActionsProps> = ({ 
  questionnaire,
  onUpdate 
}) => {
  const toast = useToast();
  
  const handleExportQuestionnaire = async () => {
    try {
      await exportQuestionnaireToCsv(questionnaire.id);
      
      showToast(toast, {
        title: 'Export Successful',
        description: `${questionnaire.name} data has been downloaded.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting questionnaire:', error);
      showToast(toast, {
        title: 'Export Failed',
        description: 'Failed to export questionnaire',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Tooltip label="Export questionnaire data">
      <IconButton
        aria-label={`Export ${questionnaire.name}`}
        icon={<DownloadIcon />}
        size="sm"
        colorScheme="blue"
        onClick={handleExportQuestionnaire}
      />
    </Tooltip>
  );
};

export default QuestionnaireActions; 