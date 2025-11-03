import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import Container from '../components/Container';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: string;
  isGroup?: boolean;
  groupName?: string;
  groupAdmin?: string;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
    read: boolean;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
  imageUrl?: string;
  sender: {
    firstName: string;
    lastName: string;
  };
}

// Typing Indicator Component
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};

export default function ChatScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { typingUsers, sendTypingIndicator, fetchTypingUsers } = useChat();
  const flatListRef = useRef<FlatList>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    route?.params?.conversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);

  // New Chat & Search States
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searching, setSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);

      // Set up polling for new messages every 5 seconds (avoid rate limiting)
      const messagesPollInterval = setInterval(() => {
        pollForNewMessages(selectedConversation);
      }, 5000);

      // Poll for typing status every 10 seconds (less frequently to avoid rate limiting)
      const typingPollInterval = setInterval(() => {
        fetchTypingUsers(selectedConversation);
      }, 10000);

      return () => {
        clearInterval(messagesPollInterval);
        clearInterval(typingPollInterval);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.getMessages(conversationId);
      if (response.success) {
        const loadedMessages = response.data || [];
        setMessages(loadedMessages);

        // Track the timestamp of the last message for polling
        if (loadedMessages.length > 0) {
          const lastMsg = loadedMessages[loadedMessages.length - 1];
          setLastMessageTimestamp(lastMsg.createdAt);
        }

        await api.markAsRead(conversationId);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      Alert.alert('Feil', 'Kunne ikke laste meldinger');
      setMessages([]);
    }
  };

  const pollForNewMessages = async (conversationId: string) => {
    try {
      if (!lastMessageTimestamp) return;

      const response = await api.getMessages(conversationId, lastMessageTimestamp);
      if (response.success && response.data && response.data.length > 0) {
        const newMessages = response.data;

        // Add new messages to the existing list
        setMessages(prev => [...prev, ...newMessages]);

        // Update the last message timestamp
        const lastMsg = newMessages[newMessages.length - 1];
        setLastMessageTimestamp(lastMsg.createdAt);

        // Mark as read
        await api.markAsRead(conversationId);

        // Refresh conversations to update last message
        loadConversations();
      }
    } catch (error: any) {
      // Silently fail for polling errors to avoid spamming alerts
      console.error('Failed to poll for new messages:', error);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      const response = await api.searchUsers(searchQuery);
      if (response.success) {
        // Filter out current user
        const filtered = response.data.filter((u: User) => u.id !== user?.id);
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const startDirectChat = async (otherUserId: string) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(conv =>
        !conv.isGroup &&
        conv.participants.some(p => p.id === otherUserId)
      );

      if (existingConv) {
        setShowNewChatModal(false);
        setSearchQuery('');
        setSelectedConversation(existingConv.id);
      } else {
        // Create new conversation
        const response = await api.createConversation([otherUserId]);
        if (response.success) {
          await loadConversations();
          setShowNewChatModal(false);
          setSearchQuery('');
          setSelectedConversation(response.data.id);
        }
      }
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      // Check if it's a 404 error (endpoint doesn't exist)
      if (error?.response?.status === 404) {
        Alert.alert(
          'Chat ikke tilgjengelig',
          'Chat-funksjonen er ikke tilgjengelig i produksjonsmiljøet ennå.'
        );
      } else {
        Alert.alert('Feil', 'Kunne ikke starte samtale');
      }
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      Alert.alert('Obs', 'Gruppechat må ha navn og minst 2 medlemmer');
      return;
    }

    try {
      const response = await api.createGroupConversation(groupName, selectedUsers);
      if (response.success) {
        await loadConversations();
        setShowGroupModal(false);
        setGroupName('');
        setSelectedUsers([]);
        setSearchQuery('');
        setSelectedConversation(response.data.id);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Feil', 'Kunne ikke opprette gruppe');
    }
  };

  const addMemberToGroup = async (userId: string) => {
    if (!selectedConversation) return;

    try {
      const response = await api.addGroupMember(selectedConversation, userId);
      if (response.success) {
        await loadConversations();
        Alert.alert('Suksess', 'Medlem lagt til');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      Alert.alert('Feil', 'Kunne ikke legge til medlem');
    }
  };

  const removeMemberFromGroup = async (userId: string) => {
    if (!selectedConversation) return;

    Alert.alert(
      'Bekreft',
      'Er du sikker på at du vil fjerne dette medlemmet?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fjern',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.removeGroupMember(selectedConversation, userId);
              if (response.success) {
                await loadConversations();
                Alert.alert('Suksess', 'Medlem fjernet');
              }
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Feil', 'Kunne ikke fjerne medlem');
            }
          }
        }
      ]
    );
  };

  const leaveGroup = async () => {
    if (!selectedConversation) return;

    Alert.alert(
      'Forlat gruppe',
      'Er du sikker på at du vil forlate denne gruppen?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Forlat',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.leaveGroup(selectedConversation);
              if (response.success) {
                await loadConversations();
                setSelectedConversation(null);
                Alert.alert('Suksess', 'Du har forlatt gruppen');
              }
            } catch (error) {
              console.error('Failed to leave group:', error);
              Alert.alert('Feil', 'Kunne ikke forlate gruppen');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse nødvendig', 'Vi trenger tilgang til bildene dine');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedImage) || !selectedConversation) return;

    try {
      setSending(true);

      let imageUrl = null;
      if (selectedImage) {
        imageUrl = selectedImage;
      }

      const response = await api.sendMessage(selectedConversation, messageText, imageUrl);
      if (response.success) {
        const newMessage = {
          ...response.data,
          read: false,
        };
        setMessages([...messages, newMessage]);

        // Update last message timestamp
        setLastMessageTimestamp(newMessage.createdAt);

        setMessageText('');
        setSelectedImage(null);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Feil', 'Kunne ikke sende melding');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'I går';
    } else if (days < 7) {
      return date.toLocaleDateString('nb-NO', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('nb-NO', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };

  const formatLastSeen = (lastSeenDate: string) => {
    const date = new Date(lastSeenDate);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'nettopp';
    } else if (minutes < 60) {
      return `${minutes}m siden`;
    } else if (hours < 24) {
      return `${hours}t siden`;
    } else if (days === 1) {
      return 'i går';
    } else {
      return `${days}d siden`;
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '💪', '👏', '🎉', '✅', '❌', '💯', '🤔', '😎', '🙌', '👌', '💙', '😍', '🤗', '😅'];

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== user?.id);
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroup) {
      return conversation.groupName || 'Gruppe';
    }
    const other = getOtherParticipant(conversation);
    return other ? `${other.firstName} ${other.lastName}` : 'Ukjent';
  };

  const renderNewChatModal = () => (
    <Modal
      visible={showNewChatModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowNewChatModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowNewChatModal(false)}
        />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ny samtale</Text>
            <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Søk etter brukere..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => {
                setShowNewChatModal(false);
                setShowGroupModal(true);
              }}
            >
              <Ionicons name="people" size={24} color="#0084FF" />
              <Text style={styles.modalActionText}>Opprett gruppechat</Text>
            </TouchableOpacity>
          </View>

          {searching ? (
            <ActivityIndicator color="#0084FF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => startDirectChat(item.id)}
                >
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={24} color="#0084FF" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length >= 2 ? (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>Ingen brukere funnet</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderGroupModal = () => (
    <Modal
      visible={showGroupModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGroupModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowGroupModal(false)}
        />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ny gruppechat</Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Gruppenavn..."
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Søk etter medlemmer..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {selectedUsers.length > 0 && (
            <View style={styles.selectedUsersContainer}>
              <Text style={styles.selectedUsersLabel}>
                Valgte: {selectedUsers.length}
              </Text>
            </View>
          )}

          {searching ? (
            <ActivityIndicator color="#0084FF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.userItem, isSelected && styles.userItemSelected]}
                    onPress={() => {
                      setSelectedUsers(prev =>
                        isSelected
                          ? prev.filter(id => id !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color="#0084FF" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={[
              styles.createGroupButton,
              (selectedUsers.length < 2 || !groupName.trim()) && styles.createGroupButtonDisabled
            ]}
            onPress={createGroupChat}
            disabled={selectedUsers.length < 2 || !groupName.trim()}
          >
            <Text style={styles.createGroupButtonText}>Opprett gruppe</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderGroupInfoModal = () => {
    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation || !conversation.isGroup) return null;

    const isAdmin = conversation.groupAdmin === user?.id;

    return (
      <Modal
        visible={showGroupInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{conversation.groupName}</Text>
              <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.groupMembersLabel}>
              Medlemmer ({conversation.participants.length})
            </Text>

            <FlatList
              data={conversation.participants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelf = item.id === user?.id;
                const isGroupAdmin = item.id === conversation.groupAdmin;

                return (
                  <View style={styles.memberItem}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={20} color="#0084FF" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {item.firstName} {item.lastName} {isSelf && '(deg)'}
                      </Text>
                      {isGroupAdmin && (
                        <Text style={styles.adminBadge}>Admin</Text>
                      )}
                    </View>
                    {isAdmin && !isSelf && (
                      <TouchableOpacity
                        onPress={() => removeMemberFromGroup(item.id)}
                        style={styles.removeMemberButton}
                      >
                        <Ionicons name="remove-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />

            {isAdmin && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => {
                  setShowGroupInfoModal(false);
                  setShowNewChatModal(true);
                }}
              >
                <Ionicons name="person-add" size={20} color="#0084FF" />
                <Text style={styles.addMemberButtonText}>Legg til medlem</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.leaveGroupButton}
              onPress={leaveGroup}
            >
              <Ionicons name="exit" size={20} color="#EF4444" />
              <Text style={styles.leaveGroupButtonText}>Forlat gruppe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Conversations List View
  if (!selectedConversation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.chatHeader}>
            <Container>
              <View style={styles.chatHeaderContent}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.chatTitle}>Meldinger</Text>
                <TouchableOpacity
                  style={styles.newChatButton}
                  onPress={() => setShowNewChatModal(true)}
                >
                  <Ionicons name="create-outline" size={24} color="#0084FF" />
                </TouchableOpacity>
              </View>
            </Container>
          </View>
          <Container>
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.conversationsList}
              renderItem={({ item }) => {
                const otherUser = getOtherParticipant(item);
                const isOnline = item.isGroup
                  ? false
                  : otherUser?.isOnline;

                return (
                  <TouchableOpacity
                    style={styles.conversationItem}
                    onPress={() => setSelectedConversation(item.id)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.conversationAvatar}>
                        <Ionicons
                          name={item.isGroup ? "people" : "person"}
                          size={24}
                          color="#0084FF"
                        />
                      </View>
                      {isOnline && (
                        <View style={styles.onlineIndicator} />
                      )}
                    </View>
                    <View style={styles.conversationContent}>
                      <View style={styles.conversationHeader}>
                        <Text style={styles.conversationName}>
                          {getConversationName(item)}
                        </Text>
                        {item.lastMessage && (
                          <Text style={styles.conversationTime}>
                            {formatTime(item.lastMessage.createdAt)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.lastMessageContainer}>
                        {item.lastMessage && (
                          <Text
                            style={[
                              styles.lastMessage,
                              item.unreadCount > 0 && styles.lastMessageUnread
                            ]}
                            numberOfLines={1}
                          >
                            {item.lastMessage.content}
                          </Text>
                        )}
                        {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Ingen samtaler ennå</Text>
                  <TouchableOpacity
                    style={styles.startChatButton}
                    onPress={() => setShowNewChatModal(true)}
                  >
                    <Text style={styles.startChatButtonText}>Start ny samtale</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </Container>
        </View>
        {renderNewChatModal()}
        {renderGroupModal()}
      </SafeAreaView>
    );
  }

  // Chat View
  const conversation = conversations.find((c) => c.id === selectedConversation);
  const otherUser = conversation && !conversation.isGroup ? getOtherParticipant(conversation) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header with Online Status */}
        <View style={styles.chatHeader}>
          <Container>
            <View style={styles.chatHeaderContent}>
              <TouchableOpacity
                onPress={() => setSelectedConversation(null)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerUserContainer}
                onPress={() => {
                  if (conversation?.isGroup) {
                    setShowGroupInfoModal(true);
                  }
                }}
              >
                <View style={styles.avatarContainer}>
                  <View style={styles.headerAvatar}>
                    <Ionicons
                      name={conversation?.isGroup ? "people" : "person"}
                      size={20}
                      color="#0084FF"
                    />
                  </View>
                  {otherUser?.isOnline && (
                    <View style={styles.onlineIndicatorSmall} />
                  )}
                </View>
                <View style={styles.headerUserInfo}>
                  <Text style={styles.chatTitle}>
                    {conversation ? getConversationName(conversation) : 'Chat'}
                  </Text>
                  {!conversation?.isGroup && (
                    <Text style={styles.onlineStatus}>
                      {otherUser?.isOnline ? (
                        <Text style={styles.onlineText}>Aktiv nå</Text>
                      ) : (
                        <Text style={styles.offlineText}>
                          Sist sett {otherUser?.lastSeen ? formatLastSeen(otherUser.lastSeen) : 'ukjent'}
                        </Text>
                      )}
                    </Text>
                  )}
                  {conversation?.isGroup && (
                    <Text style={styles.groupMemberCount}>
                      {conversation.participants.length} medlemmer
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </Container>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isOwnMessage = item.senderId === user?.id;
            const showTime = index === 0 ||
              (new Date(item.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()) > 300000;

            return (
              <View>
                {showTime && (
                  <View style={styles.timeStampContainer}>
                    <Text style={styles.timeStamp}>{formatTime(item.createdAt)}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageRow,
                    isOwnMessage && styles.ownMessageRow,
                  ]}
                >
                  {!isOwnMessage && (
                    <View style={styles.messageAvatar}>
                      <Ionicons name="person-circle" size={28} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.messageContainer}>
                    {!isOwnMessage && conversation?.isGroup && (
                      <Text style={styles.senderName}>
                        {item.sender.firstName}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isOwnMessage ? styles.ownMessage : styles.otherMessage,
                      ]}
                    >
                      {item.imageUrl && (
                        <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                      )}
                      {item.content && (
                        <Text
                          style={[
                            styles.messageText,
                            isOwnMessage && styles.ownMessageText
                          ]}
                        >
                          {item.content}
                        </Text>
                      )}
                      <View style={styles.messageFooter}>
                        <Text
                          style={[
                            styles.messageTime,
                            isOwnMessage && styles.ownMessageTime,
                          ]}
                        >
                          {new Date(item.createdAt).toLocaleTimeString('nb-NO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {isOwnMessage && (
                          <Ionicons
                            name={item.read ? "checkmark-done" : "checkmark"}
                            size={14}
                            color={item.read ? "#0084FF" : "#FFFFFF"}
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                  {isOwnMessage && <View style={{ width: 28 }} />}
                </View>
              </View>
            );
          }}
          ListFooterComponent={selectedConversation && typingUsers[selectedConversation] ? <TypingIndicator /> : null}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <Container>
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            {showEmojiPicker && (
              <View style={styles.emojiPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {commonEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiButton}
                      onPress={() => insertEmoji(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.inputWrapper}>
              <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#0084FF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Ionicons name="happy-outline" size={24} color="#0084FF" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={(text) => {
                  setMessageText(text);
                  if (selectedConversation && text.length > 0) {
                    sendTypingIndicator(selectedConversation);
                  }
                }}
                placeholder="Skriv en melding..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageText.trim() && !selectedImage) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={(!messageText.trim() && !selectedImage) || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </Container>
        </View>
      </KeyboardAvoidingView>
      {renderGroupInfoModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  newChatButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  headerUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserInfo: {
    flex: 1,
  },
  onlineStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineText: {
    color: '#10B981',
    fontWeight: '500',
  },
  offlineText: {
    color: '#9CA3AF',
  },
  groupMemberCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  conversationsList: {
    paddingTop: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  onlineIndicatorSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  conversationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#0084FF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  startChatButton: {
    backgroundColor: '#0084FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startChatButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
  },
  timeStampContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timeStamp: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageContainer: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    marginLeft: 8,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  ownMessage: {
    backgroundColor: '#0084FF',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#E4E6EB',
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#65676B',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  typingIndicator: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '80%',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E4E6EB',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 36,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#65676B',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#F0F2F5',
    color: '#111827',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0084FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalActions: {
    padding: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  userItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptySearch: {
    padding: 32,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  groupNameInput: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
  },
  selectedUsersContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  selectedUsersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0084FF',
  },
  createGroupButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#0084FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  createGroupButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  createGroupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  groupMembersLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 16,
    paddingBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  adminBadge: {
    fontSize: 12,
    color: '#0084FF',
    fontWeight: '600',
    marginTop: 2,
  },
  removeMemberButton: {
    padding: 8,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  addMemberButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0084FF',
  },
  leaveGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  leaveGroupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  emojiPickerContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  emojiButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  emojiText: {
    fontSize: 28,
  },
});
