import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, Button, Code, Alert, AlertIcon } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to your error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <Box p={5} maxW="container.md" mx="auto" mt={10}>
          <Alert status="error" mb={5}>
            <AlertIcon />
            An error occurred while rendering this component
          </Alert>
          
          <Heading size="lg" mb={4}>Something went wrong</Heading>
          
          <Text mb={4}>
            We&apos;ve encountered an unexpected issue. Please try refreshing the page or clicking the button below to reset.
          </Text>
          
          {this.state.error && (
            <Box mb={4} p={3} bg="gray.50" borderRadius="md">
              <Text fontWeight="bold" mb={2}>Error:</Text>
              <Code colorScheme="red" display="block" whiteSpace="pre-wrap" p={2}>
                {this.state.error.toString()}
              </Code>
            </Box>
          )}
          
          <Button colorScheme="blue" onClick={this.handleReset} mr={3}>
            Try Again
          </Button>
          
          <Button onClick={() => window.location.href = '/'}>
            Go to Homepage
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 