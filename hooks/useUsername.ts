import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export const useUsername = () => {
  const { data: session, status } = useSession();
  
  const username = useMemo(() => {
    if (status === 'loading') {
      return null;
    }
    
    const localUser = localStorage.getItem('currentUser');
    const sessionUser = session?.user?.username;
    
    return localUser || sessionUser || '';
  }, [session, status]);
  
  const isReady = status !== 'loading' && username !== null;
  
  return {
    username,
    isReady,
    isLoading: status === 'loading',
    hasUsername: Boolean(username && username.trim() !== '')
  };
};