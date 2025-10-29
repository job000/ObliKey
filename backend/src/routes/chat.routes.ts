import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const chatController = new ChatController();

// All routes require authentication
router.use(authenticate);

// Conversations
router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.post('/conversations', (req, res) => chatController.createConversation(req, res));
router.post('/conversations/group', (req, res) => chatController.createGroupConversation(req, res));
router.post('/support', (req, res) => chatController.startSupportChat(req, res));
router.patch('/conversations/:conversationId/read', (req, res) => chatController.markConversationAsRead(req, res));
router.post('/conversations/:conversationId/members', (req, res) => chatController.addGroupMember(req, res));
router.delete('/conversations/:conversationId/members/:userId', (req, res) => chatController.removeGroupMember(req, res));
router.post('/conversations/:conversationId/leave', (req, res) => chatController.leaveGroup(req, res));

// Users
router.get('/users', (req, res) => chatController.getAvailableUsers(req, res));

// Unread count
router.get('/unread-count', (req, res) => chatController.getUnreadCount(req, res));

// Module status
router.get('/module-status', (req, res) => chatController.getChatModuleStatus(req, res));
router.post('/toggle-module', (req, res) => chatController.toggleChatModule(req, res));

// Messages
router.get('/conversations/:conversationId/messages', (req, res) => chatController.getMessages(req, res));
router.post('/conversations/:conversationId/messages', (req, res) => chatController.sendMessage(req, res));
router.delete('/messages/:id', (req, res) => chatController.deleteMessage(req, res));

// Typing indicators
router.post('/conversations/:conversationId/typing', (req, res) => chatController.setTypingIndicator(req, res));
router.get('/conversations/:conversationId/typing', (req, res) => chatController.getTypingUsers(req, res));

export default router;
