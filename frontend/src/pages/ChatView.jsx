import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  updateConversationTitle,
  sendMessage
} from '../data/chatApi.js';
import PageLayout from '../components/layout/PageLayout.jsx';

export default function ChatView() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef(null);

  const selectConversation = useCallback(async (conversationId) => {
    try {
      const result = await getConversation(conversationId);
      setCurrentConversation(result.conversation);
      setMessages(result.conversation.messages || []);
      setError(null);
    } catch (err) {
      setError('Failed to load conversation');
      console.error(err);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getConversations(50);
      setConversations(result.conversations || []);

      // Auto-select first conversation if exists
      if (result.conversations && result.conversations.length > 0) {
        await selectConversation(result.conversations[0].id);
      }
    } catch (err) {
      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      const result = await createConversation();
      await loadConversations();
      await selectConversation(result.conversation.id);
    } catch (err) {
      setError('Failed to create conversation');
      console.error(err);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      await loadConversations();

      // Clear current if deleted
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
    }
  };

  const handleStartRename = (conversationId, currentTitle) => {
    setEditingConversationId(conversationId);
    setEditingTitle(currentTitle || '');
  };

  const handleCancelRename = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleSaveRename = async (conversationId) => {
    if (!editingTitle.trim()) {
      setError('Title cannot be empty');
      return;
    }

    try {
      await updateConversationTitle(conversationId, editingTitle.trim());
      await loadConversations();

      // Update current conversation title if it's the one being edited
      if (currentConversation?.id === conversationId) {
        setCurrentConversation({ ...currentConversation, title: editingTitle.trim() });
      }

      setEditingConversationId(null);
      setEditingTitle('');
    } catch (err) {
      setError('Failed to rename conversation');
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || !currentConversation) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    setError(null);

    // Add user message to UI immediately
    const tempUserMessage = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      await sendMessage(currentConversation.id, userMessage);

      // Replace temp message and add AI response
      await selectConversation(currentConversation.id);
    } catch (err) {
      setError(err.message || 'Failed to send message');
      // Remove the temp message on error
      setMessages(prev => prev.filter(m => m !== tempUserMessage));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout title="AI Chat" showBackButton={false} loading={loading}>
      <div className="flex h-[calc(100vh-180px)] bg-surface-900 rounded-lg border border-surface-700 overflow-hidden">

        {/* Sidebar - Conversations List */}
        <div className="w-64 bg-surface-800 border-r border-surface-700 flex flex-col">
          <div className="p-4 border-b border-surface-700">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700
                       text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-surface-600 italic text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                      currentConversation?.id === conv.id
                        ? 'bg-surface-700'
                        : 'hover:bg-surface-700/50'
                    }`}
                  >
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => selectConversation(conv.id)}
                    >
                      <p className="text-sm text-surface-100 truncate">
                        {conv.title || conv.first_message || 'New Conversation'}
                      </p>
                      <p className="font-mono text-xs text-surface-500">
                        {conv.message_count} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="ml-2 p-1 text-surface-400 hover:text-danger-400 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!currentConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-surface-700 mx-auto mb-4" />
                <h3 className="font-display text-lg text-surface-300 mb-2">
                  No conversation selected
                </h3>
                <p className="text-sm text-surface-500 mb-4">
                  Start a new conversation to ask questions about your listening data
                </p>
                <button
                  onClick={handleNewConversation}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Start Chatting
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="border-b border-surface-700 px-4 py-3 bg-surface-800/50">
                {editingConversationId === currentConversation?.id ? (
                  // Editing mode
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveRename(currentConversation.id);
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                      className="flex-1 bg-surface-800 border border-brand-500 rounded px-3 py-2 text-surface-100
                               focus:outline-none focus:ring-1 focus:ring-brand-400"
                      placeholder="Conversation title..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(currentConversation.id)}
                      className="px-3 py-2 bg-success-600 hover:bg-success-700 text-white rounded text-sm
                               transition-colors flex items-center gap-1"
                      title="Save"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="px-3 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded text-sm
                               transition-colors"
                      title="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  // Normal mode
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-surface-100 truncate">
                      {currentConversation?.title || currentConversation?.first_message || 'New Conversation'}
                    </h2>
                    <button
                      onClick={() => handleStartRename(
                        currentConversation.id,
                        currentConversation.title || currentConversation.first_message || 'New Conversation'
                      )}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-300 hover:text-white
                               hover:bg-surface-700 rounded transition-colors"
                      title="Rename conversation"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Rename
                    </button>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-surface-500 mt-8">
                    <p className="mb-4">Ask me anything about your listening history!</p>
                    <div className="space-y-1.5">
                      <p className="font-display text-xs uppercase tracking-widest text-brand-400 mb-2">Try Asking</p>
                      <p className="font-mono text-sm text-surface-400">&quot;What are my top artists this month?&quot;</p>
                      <p className="font-mono text-sm text-surface-400">&quot;How many times have I listened to Kendrick Lamar?&quot;</p>
                      <p className="font-mono text-sm text-surface-400">&quot;What were my listening stats last week?&quot;</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-700 text-surface-100'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="text-sm prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                // Style markdown elements for chat
                                h1: ({_node, ...props}) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                h2: ({_node, ...props}) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                                h3: ({_node, ...props}) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
                                p: ({_node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({_node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                ol: ({_node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                li: ({_node, ...props}) => <li className="ml-2" {...props} />,
                                strong: ({_node, ...props}) => <strong className="font-semibold text-brand-300" {...props} />,
                                code: ({_node, ...props}) => <code className="bg-surface-600 px-1 rounded text-xs" {...props} />,
                                pre: ({_node, ...props}) => <pre className="bg-surface-600 p-2 rounded text-xs overflow-x-auto mb-2" {...props} />
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <p className="font-mono text-xs mt-1 opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-surface-700 rounded px-4 py-2">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error Display */}
              {error && (
                <div className="px-4 py-2 bg-danger-900/20 border-t border-danger-700">
                  <p className="text-sm text-danger-300">{error}</p>
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-surface-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me about your listening data..."
                    disabled={sending}
                    className="flex-1 bg-surface-800 border border-surface-700 rounded px-4 py-2 text-surface-100
                             placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sending}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-surface-600 disabled:cursor-not-allowed
                             text-white p-2 rounded transition-colors"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
