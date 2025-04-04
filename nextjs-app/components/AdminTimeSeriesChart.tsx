import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimeSeriesDataPoint {
  date: string;
  count: number;
}

interface AdminTimeSeriesChartProps {
  timeSeriesData: TimeSeriesDataPoint[];
  title?: string;
}

export const AdminTimeSeriesChart: React.FC<AdminTimeSeriesChartProps> = ({
  timeSeriesData,
  title = 'Completions Over Time'
}) => {
  const bgColor = 'white';
  const borderColor = 'gray.200';
  
  // Fill in missing dates in the last 30 days
  const filledData = fillMissingDates(timeSeriesData);
  
  const data = {
    labels: filledData.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'Questionnaire Completions',
        data: filledData.map(item => item.count),
        borderColor: 'rgba(24, 118, 192, 1)', // blue.500
        backgroundColor: 'rgba(24, 118, 192, 0.2)', // blue.500 with alpha
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#1A202C', // gray.800
          font: {
            family: "'Poppins', sans-serif",
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        callbacks: {
          title: function(tooltipItems: any) {
            return tooltipItems[0].label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#4A5568', // gray.600
          font: {
            family: "'Poppins', sans-serif",
          }
        },
        grid: {
          color: 'rgba(160, 174, 192, 0.2)', // gray.400 with alpha
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#4A5568', // gray.600
          font: {
            family: "'Poppins', sans-serif",
          }
        },
        grid: {
          color: 'rgba(160, 174, 192, 0.2)', // gray.400 with alpha
        }
      },
    },
  };
  
  return (
    <Box
      p={6}
      shadow="md"
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={bgColor}
    >
      <Heading size="md" mb={4} color={'blue.600'}>{title}</Heading>
      <Box height="300px">
        <Line options={options} data={data} />
      </Box>
    </Box>
  );
};

// Helper function to fill in missing dates with zero counts
function fillMissingDates(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
  const result: TimeSeriesDataPoint[] = [];
  const dateMap = new Map<string, number>();
  
  // Create a map of existing dates and counts
  data.forEach(item => {
    dateMap.set(item.date, item.count);
  });
  
  // Get date range for the last 30 days
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    result.push({
      date: dateStr,
      count: dateMap.get(dateStr) || 0,
    });
  }
  
  return result;
}

// Helper function to format dates in a more readable format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
} 