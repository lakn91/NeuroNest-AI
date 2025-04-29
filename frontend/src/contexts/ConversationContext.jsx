/**
 * Conversation Context
 * Provides conversation management functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

// Create the conversation context
const ConversationContext = createContext();

/**
 * Custom hook to use the conversation context
 * @returns {Object} Conversation context
 */
export const useConversation = () => {
  return useContext(ConversationContext);
};

/**
 * Conversation Provider Component
 * Wraps the application and provides conversation management functionality
 */
export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsubscribe, setUnsubscribe] = useState(null);
  
  const { currentUser } = useAuth();
  const { conversationService } = useDatabase();

  /**
   * Create a new conversation
   * @param {Object} conversationData - Conversation data
   * @returns {Promise} Promise with conversation ID
   */
  const createConversation = async (conversationData) => {
    if (!currentUser) return { id: null, error: 'No user logged in' };
    
    const result = await conversationService.createConversation(currentUser.uid, conversationData);
    
    if (!result.error) {
      // Fetch the new conversation to add to the conversations list
      const { data } = await conversationService.getConversation(result.id);
      
      if (data) {
        setConversations(prev => [data, ...prev]);
        setCurrentConversation(data);
        setMessages(data.messages || []);
      }
    }
    
    return result;
  };

  /**
   * Get a conversation by ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Promise with conversation data
   */
  const getConversation = async (conversationId) => {
    const result = await conversationService.getConversation(conversationId);
    
    if (!result.error && result.data) {
      setCurrentConversation(result.data);
      setMessages(result.data.messages || []);
    }
    
    return result;
  };

  /**
   * Get all conversations for the current user
   * @returns {Promise} Promise with conversations array
   */
  const getUserConversations = async () => {
    if (!currentUser) return { data: [], error: 'No user logged in' };
    
    setLoading(true);
    const result = await conversationService.getUserConversations(currentUser.uid);
    
    if (!result.error) {
      setConversations(result.data);
    }
    
    setLoading(false);
    return result;
  };

  /**
   * Add a message to the current conversation
   * @param {Object} message - Message object
   * @returns {Promise} Promise that resolves when message is added
   */
  const addMessage = async (message) => {
    if (!currentConversation) return { error: 'No active conversation' };
    
    const result = await conversationService.addMessage(currentConversation.id, message);
    
    // We don't need to update the messages state here because the real-time listener will do it
    
    return result;
  };

  /**
   * Update conversation metadata
   * @param {string} conversationId - Conversation ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise} Promise that resolves when metadata is updated
   */
  const updateConversationMetadata = async (conversationId, metadata) => {
    const result = await conversationService.updateConversationMetadata(conversationId, metadata);
    
    if (!result.error) {
      // Update the conversation in the conversations list
      setConversations(prev => 
        prev.map(conversation => 
          conversation.id === conversationId 
            ? { ...conversation, ...metadata, updatedAt: new Date().toISOString() } 
            : conversation
        )
      );
      
      // Update current conversation if it's the one being updated
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(prev => ({ ...prev, ...metadata, updatedAt: new Date().toISOString() }));
      }
    }
    
    return result;
  };

  /**
   * Delete a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Promise that resolves when conversation is deleted
   */
  const deleteConversation = async (conversationId) => {
    const result = await conversationService.deleteConversation(conversationId);
    
    if (!result.error) {
      // Remove the conversation from the conversations list
      setConversations(prev => prev.filter(conversation => conversation.id !== conversationId));
      
      // Clear current conversation if it's the one being deleted
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
    
    return result;
  };

  /**
   * Set the current conversation
   * @param {Object|string} conversation - Conversation object or ID
   */
  const setActiveConversation = async (conversation) => {
    // Unsubscribe from previous conversation if any
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    if (typeof conversation === 'string') {
      // If conversation is an ID, fetch the conversation data
      const { data } = await conversationService.getConversation(conversation);
      
      if (data) {
        setCurrentConversation(data);
        setMessages(data.messages || []);
        
        // Subscribe to real-time updates
        const unsub = conversationService.onConversationChanged(conversation, (updatedConversation) => {
          setCurrentConversation(updatedConversation);
          setMessages(updatedConversation.messages || []);
        });
        
        setUnsubscribe(() => unsub);
      }
    } else if (conversation) {
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
      
      // Subscribe to real-time updates
      const unsub = conversationService.onConversationChanged(conversation.id, (updatedConversation) => {
        setCurrentConversation(updatedConversation);
        setMessages(updatedConversation.messages || []);
      });
      
      setUnsubscribe(() => unsub);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  };

  /**
   * Clear the current conversation
   */
  const clearActiveConversation = () => {
    // Unsubscribe from current conversation if any
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    setCurrentConversation(null);
    setMessages([]);
  };

  // Load user conversations when user changes
  useEffect(() => {
    if (currentUser) {
      getUserConversations();
    } else {
      setConversations([]);
      clearActiveConversation();
      setLoading(false);
    }
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Value to be provided by the context
  const value = {
    conversations,
    currentConversation,
    messages,
    loading,
    createConversation,
    getConversation,
    getUserConversations,
    addMessage,
    updateConversationMetadata,
    deleteConversation,
    setActiveConversation,
    clearActiveConversation
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;