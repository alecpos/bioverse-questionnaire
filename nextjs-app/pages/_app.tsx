import { useState, useEffect } from 'react';
import type { AppProps } from 'next/app';
import { ChakraProvider, extendTheme, ThemeConfig } from '@chakra-ui/react';
import { AuthProvider } from '../contexts/AuthContext';
import { QuestionnairesProvider } from '../contexts/QuestionnairesContext';
import { useRouter } from 'next/router';
import ErrorBoundary from '../components/ErrorBoundary';
import Head from 'next/head';

// Theme config for color mode - forcing light mode only
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Bioverse brand colors based on the website
const colors = {
  blue: {
    50: '#e6f0fa',
    100: '#b9d6f2',
    200: '#8bbeea',
    300: '#5ca7e2',
    400: '#2e90da',
    500: '#1876c0',
    600: '#0f5b97',
    700: '#06416e',
    800: '#002745',
    900: '#000e1d',
  },
  gray: {
    50: '#f7fafc',
    100: '#edf2f7',
    200: '#e2e8f0',
    300: '#cbd5e0',
    400: '#a0aec0',
    500: '#718096',
    600: '#4a5568',
    700: '#2d3748',
    800: '#1a202c',
    900: '#171923',
  },
  green: {
    500: '#38a169',
  },
  yellow: {
    500: '#d69e2e',
  },
  red: {
    500: '#e53e3e',
  }
};

// Extend the theme
const theme = extendTheme({
  config,
  colors,
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Poppins', sans-serif",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  styles: {
    global: {
      body: {
        bg: 'white',
        color: 'gray.800',
        fontFamily: "'Poppins', sans-serif",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 500,
        borderRadius: '4px',
      },
      variants: {
        solid: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
          _active: {
            bg: 'blue.700',
          },
        },
        outline: {
          borderColor: 'blue.500',
          color: 'blue.500',
          _hover: {
            bg: 'blue.50',
          },
        },
        ghost: {
          color: 'blue.500',
          _hover: {
            bg: 'blue.50',
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: 600,
        color: 'blue.600',
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: '4px',
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    Stat: {
      baseStyle: {
        container: {
          borderRadius: '8px',
          boxShadow: 'md',
        },
        label: {
          fontWeight: 500,
          color: 'gray.600',
        },
        number: {
          color: 'blue.600',
          fontWeight: 600,
        },
        helpText: {
          color: 'gray.500',
        },
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  
  // Reset error state on route change
  useEffect(() => {
    setHasError(false);
  }, [router.pathname]);
  
  // Simplified error handling
  if (hasError) {
    return (
      <ChakraProvider theme={theme}>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link rel="icon" href="/65b7f40d5dcd71efcf9bbe8a_BIOVERSE Branding_Option 1 (1).png" />
          <title>BIOVERSE Questionnaire - Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={{ 
          padding: '20px', 
          maxWidth: '600px', 
          margin: '100px auto',
          backgroundColor: 'white',
          color: '#1A202C',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          fontFamily: "'Poppins', sans-serif",
        }}>
          <h1 style={{ marginBottom: '20px', fontWeight: '600' }}>Something went wrong</h1>
          <p style={{ marginBottom: '20px' }}>
            The application encountered an error. Please try refreshing the page.
          </p>
          <div>
            <button 
              style={{ 
                backgroundColor: '#1876c0', 
                color: 'white', 
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                marginRight: '10px',
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: '500',
              }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button
              style={{ 
                backgroundColor: '#4A5568', 
                color: 'white', 
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: '500',
              }}
              onClick={() => router.push('/')}
            >
              Go to Home
            </button>
          </div>
        </div>
      </ChakraProvider>
    );
  }
  
  try {
    return (
      <ChakraProvider theme={theme}>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link rel="icon" href="/65b7f40d5dcd71efcf9bbe8a_BIOVERSE Branding_Option 1 (1).png" />
          <title>BIOVERSE Questionnaire</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <AuthProvider>
          <QuestionnairesProvider>
            <Component {...pageProps} />
          </QuestionnairesProvider>
        </AuthProvider>
      </ChakraProvider>
    );
  } catch (error) {
    console.error("Error in root app component:", error);
    setHasError(true);
    return null; // Will render the error UI on next render
  }
} 