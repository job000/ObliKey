import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import { Send, Plus, X, Smile, Check, CheckCheck, Users } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  }>;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
  } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  read: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string | null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.getMessages(conversationId);
      if (response.success) {
        setMessages(response.data);
        scrollToBottom();
        // Mark messages as read
        await api.markConversationAsRead(conversationId);
        // Refresh conversations to update unread count
        loadConversations();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Load available users for new chat
  const loadAvailableUsers = async () => {
    try {
      const response = await api.getChatUsers();
      console.log('Available users response:', response);
      if (response.success) {
        setAvailableUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  // Reload conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reload messages every 3 seconds if conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      loadMessages(selectedConversation);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    setIsTyping(false);

    try {
      await api.sendMessage(selectedConversation, {
        content: newMessage.trim(),
        type: 'text'
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      await loadMessages(selectedConversation);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Kunne ikke sende melding');
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async () => {
    if (!selectedUser) {
      alert('Velg en bruker');
      return;
    }

    try {
      const response = await api.createConversation({
        participantIds: [selectedUser],
        isGroup: false
      });

      if (response.success) {
        setShowNewChat(false);
        setSelectedUser('');
        setSelectedConversation(response.data.id);
        await loadConversations();
        await loadMessages(response.data.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Kunne ikke opprette samtale');
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Trigger typing indicator
    setIsTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants && conv.participants.length > 0
      ? conv.participants[0]
      : null;
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const other = getOtherParticipant(conv);
    return other ? `${other.firstName} ${other.lastName}` : 'Ukjent';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'I går';
    } else if (days < 7) {
      return date.toLocaleDateString('nb-NO', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <Layout>
      <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(true);
                  loadAvailableUsers();
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ny
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Laster...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Ingen samtaler ennå</p>
                <p className="text-sm mt-2">Start en ny samtale!</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
                      loadMessages(conv.id);
                    }}
                    className={`w-full p-4 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 text-left transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {other?.avatar ? (
                        <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-gray-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getConversationName(conv)}
                        </h3>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage.sender.id === user?.id ? 'Du: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      )}
                      {conv.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Area */}
        {selectedConversation && selectedConv ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                {(() => {
                  const other = getOtherParticipant(selectedConv);
                  return (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {other?.avatar ? (
                          <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getConversationName(selectedConv)}
                        </h3>
                        {otherUserTyping && (
                          <p className="text-xs text-blue-600">skriver...</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender.id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white rounded-3xl rounded-tr-md'
                          : 'bg-gray-200 text-gray-900 rounded-3xl rounded-tl-md'
                      } px-4 py-2 shadow-sm`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <div className={`flex items-center gap-1 justify-end mt-1`}>
                        <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString('nb-NO', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isOwnMessage && (
                          message.read ? (
                            <CheckCheck className="w-3 h-3 text-blue-100" />
                          ) : (
                            <Check className="w-3 h-3 text-blue-100" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Skriv en melding..."
                    className="w-full px-4 py-3 pr-12 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-10">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn btn-primary rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Velg en samtale for å starte</p>
          </div>
        )}

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Ny samtale</h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velg mottaker
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Velg en bruker...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">Ingen tilgjengelige brukere funnet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartNewChat}
                    disabled={!selectedUser}
                    className="btn btn-primary flex-1 disabled:opacity-50"
                  >
                    Start samtale
                  </button>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="btn btn-outline flex-1"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
