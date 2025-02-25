"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import LoadingScreen from './LoadingScreen';

// This component wraps pages that require authentication
// and handles reconnection logic for game sessions
export default function ReconnectionGuard({ children }) {
  const { user, loading, ensureUser } = useAuth();
  const [reconnecting, setReconnecting] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (loading) return;
    
    // If we don't have a user, try to recover or redirect to login
    if (!user) {
      const recovered = ensureUser();
      
      // If we couldn't recover a user, redirect to login page
      if (!recovered) {
        router.push('/');
        return;
      }
    }
    
    // Only check for active game sessions if we're not already in a game
    if (!pathname.includes('/game')) {
      checkForActiveGame();
    }
  }, [loading, user, pathname, router, ensureUser]);
  
  const checkForActiveGame = async () => {
    try {
      setReconnecting(true);
      setMessage('Checking for active game sessions...');
      
      // Get current user
      const currentUser = ensureUser();
      
      // Call your API to check if this user has an active game session
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/player/active-game/${currentUser._id}`
      );
      
      const data = await response.json();
      
      if (response.ok && data.activeGame) {
        setMessage('Active game found! Reconnecting...');
        
        // Wait a moment so the user can see the message
        setTimeout(() => {
          // Redirect to the active game
          router.push(`/game?lobbyId=${data.activeGame.lobbyId}`);
        }, 1500);
      } else {
        // No active game, continue to the requested page
        setReconnecting(false);
      }
    } catch (error) {
      console.error('Error checking for active game:', error);
      setReconnecting(false);
    }
  };
  
  if (loading || reconnecting) {
    return <LoadingScreen message={message || 'Loading...'} />;
  }
  
  return <>{children}</>;
}