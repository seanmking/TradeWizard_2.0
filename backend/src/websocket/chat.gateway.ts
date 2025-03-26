import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationManager } from '../ai-agent/conversation-manager';
import { ContextMemoryEngine } from '../ai-agent/context-memory';

@WebSocketGateway({
  cors: {
    origin: '*'
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  
  constructor(
    private conversationManager: ConversationManager,
    private memoryEngine: ContextMemoryEngine
  ) {}
  
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }
  
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
  
  @SubscribeMessage('startConversation')
  async handleStartConversation(client: Socket, payload: { userId: string }) {
    try {
      const conversationId = await this.memoryEngine.createMemory(payload.userId);
      
      client.emit('conversation', {
        conversationId,
        message: {
          role: 'assistant',
          content: "Hi there! I'm Sarah, your export readiness consultant at TradeWizard. I'm here to help you assess your export readiness and identify opportunities for your products in international markets. To start, could you tell me about your business and what products you're interested in exporting?",
          timestamp: new Date()
        }
      });
      
      return { conversationId };
    } catch (error) {
      console.error('Error starting conversation:', error);
      client.emit('error', { message: 'Failed to start conversation' });
    }
  }
  
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { conversationId: string, message: string }) {
    try {
      // Emit typing indicator
      client.emit('typingStarted', { conversationId: payload.conversationId });
      
      // Process message
      const response = await this.conversationManager.processMessage(
        payload.conversationId,
        payload.message
      );
      
      // Remove typing indicator
      client.emit('typingStopped', { conversationId: payload.conversationId });
      
      // Send response with additional data
      client.emit('conversation', {
        conversationId: payload.conversationId,
        message: {
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        },
        additionalData: {
          stage: response.stage,
          productAnalysis: response.productAnalysis,
          competitiveData: response.competitiveData
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
      
      client.emit('typingStopped', { conversationId: payload.conversationId });
      client.emit('conversation', {
        conversationId: payload.conversationId,
        message: {
          role: 'assistant',
          content: "I apologize, but I encountered an issue processing your message. Could we try again?",
          timestamp: new Date()
        },
        error: true
      });
    }
  }
} 