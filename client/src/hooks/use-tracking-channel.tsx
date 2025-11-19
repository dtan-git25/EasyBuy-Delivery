import { useEffect, useRef } from 'react';

/**
 * Shared WebSocket tracking channel hook that prevents infinite loops
 * by using refs to guard join_tracking emissions and stable dependencies.
 * 
 * @param socket - WebSocket connection
 * @param user - User object with id and role
 * @param sendMessage - Function to send WebSocket messages
 * @param onMessage - Callback for handling incoming messages
 */
export function useTrackingChannel(
  socket: WebSocket | null,
  user: { id: string; role: string } | null,
  sendMessage: (message: any) => void,
  onMessage: (data: any) => void
) {
  // Use refs to track if we've already joined tracking for this socket/user session
  const hasJoinedRef = useRef(false);
  const previousSocketRef = useRef<WebSocket | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !user) {
      hasJoinedRef.current = false;
      return;
    }

    // Reset join flag if socket or user has changed
    if (socket !== previousSocketRef.current || user.id !== previousUserIdRef.current) {
      hasJoinedRef.current = false;
      previousSocketRef.current = socket;
      previousUserIdRef.current = user.id;
    }

    // Only send join_tracking once per socket/user session
    if (!hasJoinedRef.current) {
      sendMessage({
        type: 'join_tracking',
        userId: user.id,
        userRole: user.role
      });
      hasJoinedRef.current = true;
    }

    // Set up message handler
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
    // Only depend on socket and user.id/user.role (primitives), not the entire user object
    // onMessage should be memoized by the caller using useCallback
  }, [socket, user?.id, user?.role, sendMessage, onMessage]);
}
