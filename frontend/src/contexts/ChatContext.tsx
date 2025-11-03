import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ChatContextType {
  unreadCount: number;
  fetchUnreadCount: () => Promise<void>;
  loading: boolean;
  typingUsers: Record<string, boolean>;
  setUserTyping: (conversationId: string, isTyping: boolean) => void;
  sendTypingIndicator: (conversationId: string) => void;
  fetchTypingUsers: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const consecutiveErrors = useRef(0);
  const backoffMultiplier = useRef(1);
  const { user } = useAuth();

  const fetchUnreadCount = async (silent: boolean = false) => {
    // Only fetch if user is logged in
    if (!user) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await api.getChatUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.count || 0);
        consecutiveErrors.current = 0; // Reset error count on success
        backoffMultiplier.current = 1; // Reset backoff on success
      }
    } catch (error: any) {
      // Silently handle 403 and 404 errors (endpoint may not exist in production)
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        if (__DEV__) {
          console.log('[Chat] Tenant is deactivated, access denied, or endpoint not available');
        }
        setUnreadCount(0);
        consecutiveErrors.current = 0; // Don't count 403/404 as consecutive errors
        return;
      }

      consecutiveErrors.current++;

      // Check if it's a 429 error (Too Many Requests)
      if (error?.response?.status === 429) {
        // Increase backoff multiplier exponentially for 429 errors
        backoffMultiplier.current = Math.min(backoffMultiplier.current * 2, 8);
        if (__DEV__) {
          console.log(`[Chat] Rate limited (429). Backing off to ${60 * backoffMultiplier.current}s`);
        }
      }

      // Only log errors in development, don't show alerts for background polling
      if (__DEV__ && consecutiveErrors.current <= 3) {
        console.error('Failed to fetch unread count:', error);
      }

      // If too many errors, set unread count to 0 to avoid confusion
      if (consecutiveErrors.current > 5) {
        setUnreadCount(0);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const setUserTyping = (conversationId: string, isTyping: boolean) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: isTyping
    }));

    // Clear typing indicator after 3 seconds of inactivity
    if (isTyping) {
      if (typingTimeouts.current[conversationId]) {
        clearTimeout(typingTimeouts.current[conversationId]);
      }

      typingTimeouts.current[conversationId] = setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: false
        }));
      }, 3000);
    }
  };

  const sendTypingIndicator = async (conversationId: string) => {
    try {
      // Send typing status to backend so other users can see it
      await api.setTypingIndicator(conversationId, true);
      // Also update local state for immediate feedback
      setUserTyping(conversationId, true);
    } catch (error) {
      // Silently fail - typing indicators are not critical
      if (__DEV__) {
        console.log('[Chat] Failed to send typing indicator:', error);
      }
    }
  };

  const fetchTypingUsers = async (conversationId: string) => {
    try {
      const response = await api.getTypingUsers(conversationId);
      if (response.success && response.data) {
        // Update typing status for this conversation
        const isTyping = response.data.typingUsers && response.data.typingUsers.length > 0;
        setUserTyping(conversationId, isTyping);
      }
    } catch (error) {
      // Silently fail - typing indicators are not critical
      if (__DEV__) {
        console.log('[Chat] Failed to fetch typing users:', error);
      }
    }
  };

  useEffect(() => {
    // Only start polling if user is logged in
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch (not silent, shows loading)
    fetchUnreadCount(false);

    // Poll for unread count with dynamic interval based on backoff
    let timeoutId: NodeJS.Timeout;

    const schedulePoll = () => {
      const delay = 30000 * backoffMultiplier.current;
      timeoutId = setTimeout(async () => {
        await fetchUnreadCount(true); // Silent polling
        schedulePoll(); // Schedule next poll
      }, delay);
    };

    // Start polling
    schedulePoll();

    return () => {
      clearTimeout(timeoutId);
      // Clean up all typing timeouts
      Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [user]);

  const value: ChatContextType = {
    unreadCount,
    fetchUnreadCount,
    loading,
    typingUsers,
    setUserTyping,
    sendTypingIndicator,
    fetchTypingUsers,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
