import React from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Heading,
  Text,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip
} from '@chakra-ui/react';
import { Bar, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip as ChartTooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  ChartTooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

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
  unique_users: number;
  first_completion: string;
  last_completion: string;
  avg_completion_time_minutes: number;
  total_responses: number;
  unique_questions_answered: number;
  total_questions: number;
  completion_rate: number;
}

interface DashboardChartsProps {
  users: User[];
  questionnaireStats: QuestionnaireStats[];
}

export const AdminDashboardCharts: React.FC<DashboardChartsProps> = ({ 
  users, 
  questionnaireStats 
}) => {
  // Use consistent light mode colors
  const borderColor = 'gray.200';
  const bgColor = 'white';
  const headingColor = 'blue.600';
  const badgeGreenBg = 'green';
  const badgeYellowBg = 'yellow';
  const badgeRedBg = 'red';
  const textColor = 'gray.700';
  const secondaryTextColor = 'gray.600';
  
  // Bioverse chart colors
  const completedColor = 'rgba(24, 118, 192, 0.8)'; // blue.500 with alpha
  const completedBorderColor = 'rgba(24, 118, 192, 1)'; // blue.500 solid
  const incompleteColor = 'rgba(203, 213, 224, 0.6)'; // gray.300 with alpha
  const incompleteBorderColor = 'rgba(160, 174, 192, 0.8)'; // gray.400 with alpha
  
  const pieChartColors = {
    completed: 'rgba(24, 118, 192, 0.8)', // blue.500 with alpha
    completedBorder: 'rgba(24, 118, 192, 1)', // blue.500 solid
    incomplete: 'rgba(203, 213, 224, 0.6)', // gray.300 with alpha
    incompleteBorder: 'rgba(160, 174, 192, 0.8)', // gray.400 with alpha
  };
  
  // Extra colors for bar charts and other visualizations
  const chartColorPalette = [
    'rgba(24, 118, 192, 0.8)', // blue.500
    'rgba(15, 91, 151, 0.8)', // blue.600
    'rgba(6, 65, 110, 0.8)', // blue.700
    'rgba(0, 39, 69, 0.8)', // blue.800
    'rgba(203, 213, 224, 0.6)', // gray.300
  ];
  
  // Calculate total completions - ensure integers are used
  const totalCompletions = users.reduce((sum, user) => {
    const completions = typeof user.completed_questionnaires === 'number' 
      ? user.completed_questionnaires 
      : parseInt(String(user.completed_questionnaires), 10) || 0;
    return sum + completions;
  }, 0);
  
  const totalPossibleCompletions = users.reduce((sum, user) => {
    const totalQuestionnaires = typeof user.total_questionnaires === 'number'
      ? user.total_questionnaires
      : parseInt(String(user.total_questionnaires), 10) || 0;
    return sum + totalQuestionnaires;
  }, 0);
  
  // Get top performing users
  const topUsers = [...users]
    .sort((a, b) => {
      const rateA = a.total_questionnaires > 0 ? a.completed_questionnaires / a.total_questionnaires : 0;
      const rateB = b.total_questionnaires > 0 ? b.completed_questionnaires / b.total_questionnaires : 0;
      return rateB - rateA;
    })
    .slice(0, 5);
  
  // Data for completion status pie chart
  const completionStatusData = {
    labels: ['Completed', 'Incomplete'],
    datasets: [
      {
        data: [totalCompletions, totalPossibleCompletions - totalCompletions],
        backgroundColor: [
          pieChartColors.completed,
          pieChartColors.incomplete
        ],
        borderColor: [
          pieChartColors.completedBorder,
          pieChartColors.incompleteBorder
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Options for pie chart
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: "'Poppins', sans-serif",
            size: 12
          }
        }
      }
    }
  };
  
  // Options for bar charts
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      },
      x: {
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            family: "'Poppins', sans-serif",
            size: 12
          }
        }
      },
    },
  };
  
  // Data for user completion bar chart
  const userCompletionData = {
    labels: users.slice(0, 10).map(user => user.username),
    datasets: [
      {
        label: 'Completed Questionnaires',
        data: users.slice(0, 10).map(user => user.completed_questionnaires),
        backgroundColor: completedColor,
        borderColor: completedBorderColor,
        borderWidth: 1,
      },
      {
        label: 'Remaining',
        data: users.slice(0, 10).map(user => 
          Math.max(0, user.total_questionnaires - user.completed_questionnaires)
        ),
        backgroundColor: incompleteColor,
        borderColor: incompleteBorderColor,
        borderWidth: 1,
      }
    ],
  };
  
  // Enhanced bar options with stacked configuration
  const stackedBarOptions = {
    ...barOptions,
    scales: {
      ...barOptions.scales,
      x: {
        stacked: true,
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: Math.max(...users.slice(0, 10).map(user => user.total_questionnaires), 3), // Set reasonable max
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      }
    }
  };

  // Data for questionnaire popularity chart
  const questionnairePopularityData = {
    labels: questionnaireStats.map(stat => stat.name),
    datasets: [
      {
        label: 'Completed',
        data: questionnaireStats.map(stat => {
          // Ensure we're dealing with a number
          return typeof stat.completions === 'number' ? stat.completions : parseInt(String(stat.completions)) || 0;
        }),
        backgroundColor: completedColor,
        borderColor: completedBorderColor,
        borderWidth: 1,
      },
      {
        label: 'Not Completed',
        data: questionnaireStats.map(stat => {
          const completions = typeof stat.completions === 'number' ? stat.completions : parseInt(String(stat.completions)) || 0;
          const potentialCompletions = users.length - completions;
          return Math.max(0, potentialCompletions);
        }),
        backgroundColor: incompleteColor,
        borderColor: incompleteBorderColor,
        borderWidth: 1,
      }
    ],
  };

  // Enhanced questionnaire popularity bar options with consistent max value
  const questionnaireBarOptions = {
    ...barOptions,
    scales: {
      ...barOptions.scales,
      x: {
        stacked: true,
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        // Set a reasonable max based on total users
        max: Math.max(...questionnaireStats.map(() => users.length), 4),
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
          }
        }
      }
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to format time
  const formatTime = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Helper function to determine badge color based on completion rate
  const getBadgeColor = (rate: number) => {
    if (rate > 75) return badgeGreenBg;
    if (rate > 50) return badgeYellowBg;
    return badgeRedBg;
  };
  
  // Log stats for debugging
  console.log('Questionnaire stats for chart:', questionnaireStats.map(stat => ({
    name: stat.name,
    completions: stat.completions,
    unique_users: stat.unique_users,
    total_responses: stat.total_responses
  })));
  console.log('Total users count:', users.length);
  
  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <Stat
          p={4}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <StatLabel fontSize="md" color={secondaryTextColor}>Total Users</StatLabel>
          <StatNumber color={headingColor}>{users.length}</StatNumber>
          <StatHelpText color={secondaryTextColor}>Registered on the platform</StatHelpText>
        </Stat>
        
        <Stat
          p={4}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <StatLabel fontSize="md" color={secondaryTextColor}>Questionnaires Completed</StatLabel>
          <StatNumber color={headingColor}>{totalCompletions}</StatNumber>
          <StatHelpText color={secondaryTextColor}>Out of {totalPossibleCompletions} total</StatHelpText>
        </Stat>
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
        <Box
          p={6}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <Heading size="md" mb={4} color={headingColor}>Questionnaire Completion Status</Heading>
          <Box height="300px">
            <Pie data={completionStatusData} options={pieOptions} />
          </Box>
        </Box>
        
        <Box
          p={6}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <Heading size="md" mb={4} color={headingColor}>Top Performing Users</Heading>
          <Box>
            {topUsers.map((user, index) => {
              const completionRate = user.total_questionnaires > 0 
                ? (user.completed_questionnaires / user.total_questionnaires) * 100 
                : 0;
              return (
                <Flex key={user.id} justify="space-between" align="center" mb={2}>
                  <Text fontWeight="medium" color={textColor}>
                    {index + 1}. {user.username}
                  </Text>
                  <Flex align="center">
                    <Badge 
                      colorScheme={getBadgeColor(completionRate)}
                      mr={2}
                    >
                      {user.completed_questionnaires}/{user.total_questionnaires} ({Math.round(completionRate)}%)
                    </Badge>
                  </Flex>
                </Flex>
              );
            })}
          </Box>
        </Box>
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
        <Box
          p={6}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <Heading size="md" mb={4} color={headingColor}>User Completion Status</Heading>
          <Text fontSize="sm" color={secondaryTextColor} mb={3}>
            Showing data for first {Math.min(10, users.length)} users
          </Text>
          <Box height="300px">
            <Bar data={userCompletionData} options={stackedBarOptions} />
          </Box>
        </Box>
        
        <Box
          p={6}
          shadow="md"
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={bgColor}
        >
          <Heading size="md" mb={4} color={headingColor}>Questionnaire Popularity</Heading>
          <Text fontSize="sm" color={secondaryTextColor} mb={3}>
            Questionnaires completed by users
          </Text>
          <Box height="300px">
            <Bar data={questionnairePopularityData} options={questionnaireBarOptions} />
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  );
}; 