import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  IconButton,
  useDisclosure,
  Stack,
  Image,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { isOpen, onToggle } = useDisclosure();
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const router = useRouter();
  
  const bgColor = 'white';
  const borderColor = 'gray.200';
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <Box>
      <Flex
        bg={bgColor}
        color={'gray.600'}
        minH={'60px'}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={borderColor}
        align={'center'}
        justifyContent={'space-between'}
      >
        <Flex
          flex={{ base: 1, md: 'auto' }}
          ml={{ base: -2 }}
          display={{ base: 'flex', md: 'none' }}
        >
          <IconButton
            onClick={onToggle}
            icon={isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />}
            variant={'ghost'}
            aria-label={'Toggle Navigation'}
          />
        </Flex>
        
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Link href={isLoggedIn ? (isAdmin ? '/admin' : '/questionnaires') : '/'} passHref>
            <Flex align="center" cursor="pointer">
              <Image 
                src="/65b7f40d5dcd71efcf9bbe8a_BIOVERSE Branding_Option 1 (1).png" 
                alt="Bioverse Logo" 
                height="36px"
                width="auto"
              />
            </Flex>
          </Link>

          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <HStack spacing={4}>
              {isLoggedIn && (
                <Link href="/questionnaires" passHref>
                  <Text
                    px={2}
                    py={1}
                    rounded={'md'}
                    _hover={{
                      textDecoration: 'none',
                      bg: 'gray.200',
                    }}
                    bg={router.pathname === '/questionnaires' ? 'gray.200' : 'transparent'}
                    cursor="pointer"
                  >
                    Questionnaires
                  </Text>
                </Link>
              )}
              
              {isAdmin && (
                <Link href="/admin" passHref>
                  <Text
                    px={2}
                    py={1}
                    rounded={'md'}
                    _hover={{
                      textDecoration: 'none',
                      bg: 'gray.200',
                    }}
                    bg={router.pathname === '/admin' ? 'gray.200' : 'transparent'}
                    cursor="pointer"
                  >
                    Admin
                  </Text>
                </Link>
              )}
            </HStack>
          </Flex>
        </Flex>

        <Flex alignItems={'center'}>
          {isLoggedIn ? (
            <HStack spacing={3}>
              <Text display={{ base: 'none', md: 'block' }}>
                Hello, {user?.username}
              </Text>
              <Button
                variant="outline"
                colorScheme="blue"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </HStack>
          ) : (
            <Button
              as={'a'}
              fontSize={'sm'}
              fontWeight={400}
              variant={'link'}
              href={'#'}
              onClick={() => router.push('/')}
            >
              Sign In
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Mobile Navigation */}
      <Box
        display={{ base: isOpen ? 'block' : 'none', md: 'none' }}
        bg={bgColor}
        p={4}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={borderColor}
      >
        <Stack as={'nav'} spacing={4}>
          {isLoggedIn && (
            <Link href="/questionnaires" passHref>
              <Text
                px={2}
                py={1}
                rounded={'md'}
                _hover={{
                  textDecoration: 'none',
                  bg: 'gray.200',
                }}
                cursor="pointer"
              >
                Questionnaires
              </Text>
            </Link>
          )}
          
          {isAdmin && (
            <Link href="/admin" passHref>
              <Text
                px={2}
                py={1}
                rounded={'md'}
                _hover={{
                  textDecoration: 'none',
                  bg: 'gray.200',
                }}
                cursor="pointer"
              >
                Admin
              </Text>
            </Link>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default Navbar; 