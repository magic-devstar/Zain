import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { MessageCircle, X, Maximize2, Minimize2, Send, Bot, User } from 'lucide-react';
import { sendChatMessage } from '../../api/chatbot';
import SkeletonLine from '../LoadeingSkeletons/SkeletonLine';

const FloatingChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: 'bot', timestamp: new Date(), loading: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [newMessageId, setNewMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const fullInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep the currently visible input focused
  useEffect(() => {
    if (isExpanded) {
      // Full-screen view
      if (fullInputRef.current) fullInputRef.current.focus();
    } else if (isOpen) {
      // Compact dialog view
      if (chatInputRef.current) chatInputRef.current.focus();
    }
  }, [isOpen, isExpanded]);

  const handleToggleChat = () => {
    setIsAnimating(true);
    setIsOpen(!isOpen);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleExpand = () => {
    setIsAnimating(true);
    setIsExpanded(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleMinimize = () => {
    setIsAnimating(true);
    setIsExpanded(false);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // User message
    const userMsg = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setNewMessageId(userMsg.id);
    setMessages((prev) => [...prev, userMsg]);
    const prompt = inputText; // save before clearing
    setInputText('');

    // Placeholder bot message while waiting
    const placeholderId = userMsg.id + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        text: '…',
        sender: 'bot',
        timestamp: new Date(),
        loading: true,
      },
    ]);

    try {
      const { data } = await sendChatMessage(prompt);
      const assistantText = data.response ?? 'Sorry, I could not understand that.';

      // Replace the placeholder with real response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: assistantText, loading: false } : m
        )
      );
      setNewMessageId(placeholderId);
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: 'Something went wrong. Please try again later.', loading: false } : m
        )
      );
      setNewMessageId(placeholderId);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reusable markdown component for messages
  const MarkdownMessage = ({ content, small }) => (
    <div className={small ? 'text-sm break-words' : 'transition-all duration-200'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({node, ...props}) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  // Animated message component
  const AnimatedMessage = ({ message, index }) => (
    <div
      className={`
        flex items-start space-x-2 transform transition-all duration-500 ease-out
        ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}
        ${newMessageId === message.id 
          ? 'animate-pulse scale-101 opacity-100' 
          : 'scale-100 opacity-100'
        }
      `}
      style={{
        animationDelay: `${index * 100}ms`,
        transform: newMessageId === message.id ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        transition-all duration-300 ease-out transform hover:scale-101
        ${message.sender === 'user'
          ? (isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-400')
          : (isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400')
        }
      `}>
        {message.sender === 'user' ? (
          <User size={16} className="text-white transition-transform duration-200" />
        ) : (
          <Bot size={16} className="text-white transition-transform duration-200" />
        )}
      </div>
      <div className={`
        max-w-[80%] px-4 py-2 rounded-2xl transform transition-all duration-300 ease-out
        hover:scale-101 hover:shadow-lg
        ${message.sender === 'user'
          ? (isDarkMode ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-500 text-white hover:bg-green-400')
          : (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300')
        }
      `}>
        {message.loading ? (
          <div className="space-y-2">
            <SkeletonLine height={12} width={140} />
            <SkeletonLine height={12} width={40} />
          </div>
        ) : (
          <MarkdownMessage content={message.text} small />
        )}
      </div>
    </div>
  );

  // Animated message component for full screen
  const AnimatedFullMessage = ({ message, index }) => (
    <div
      className={`
        flex items-start space-x-4 transform transition-all duration-500 ease- w-full
        ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}
        ${newMessageId === message.id 
          ? 'animate-pulse scale-101 opacity-100' 
          : 'scale-100 opacity-100'
        }
      `}
      style={{
        animationDelay: `${index * 100}ms`,
        transform: newMessageId === message.id ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
        transition-all duration-300 ease-out transform hover:scale-101
        ${message.sender === 'user'
          ? (isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-400')
          : (isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400')
        }
      `}>
        {message.sender === 'user' ? (
          <User size={20} className="text-white transition-transform duration-200" />
        ) : (
          <Bot size={20} className="text-white transition-transform duration-200" />
        )}
      </div>
      <div className={`
        max-w-2xl w-xl px-6 py-4 rounded-2xl transform transition-all duration-300 ease-out
        hover:scale-101 hover:shadow-lg
        ${message.sender === 'user'
          ? (isDarkMode ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-500 text-white hover:bg-green-400')
          : (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300')
        }
      `}>
        {message.loading ? (
          <div className="space-y-2">
            <SkeletonLine height={14} width={`${60 + Math.random() * 30}%`} />
            <SkeletonLine height={14} width={`${40 + Math.random() * 50}%`} />
            {Math.random() > 0.5 && (
              <SkeletonLine height={14} width={`${20 + Math.random() * 60}%`} />
            )}
          </div>
        ) : (
          <MarkdownMessage content={message.text} />
        )}
        <p className={`
          text-xs mt-2 opacity-70 transition-all duration-200
          ${message.sender === 'user' ? 'text-green-100' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}
        `}>
          {message.loading ? '' : message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );

  const FloatingButton = () => (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={handleToggleChat}
        disabled={isAnimating}
        className={`
          relative w-14 h-14 rounded-full shadow-xl transition-all duration-300 ease-out
          transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300
          ${isDarkMode 
            ? 'bg-primary hover:bg-primary/90 text-white hover:shadow-primary/25' 
            : 'bg-primary hover:bg-primary/90 text-white hover:shadow-primary/25'
          }
          ${isOpen ? 'rotate-180' : 'rotate-0'}
          ${isAnimating ? 'animate-pulse' : ''}
        `}
      >
        {/* Ripple effect */}
        <div className={`
          absolute inset-0 rounded-full transition-all duration-300 ease-out
          ${isOpen ? 'animate-ping opacity-20' : 'opacity-0'}
          ${isDarkMode ? 'bg-[#273746]' : 'bg-[#273746]'}
        `} />
        
        {/* Message icon */}
        <div className={`
          absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out
          ${isOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}
        `}>
          <MessageCircle size={24} className="drop-shadow-sm" />
        </div>
        
        {/* Close icon */}
        <div className={`
          absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}
        `}>
          <X size={24} className="drop-shadow-sm" />
        </div>
        
      </button>
    </div>
  );

  // Convert ChatDialog from a nested component to a JSX element. This keeps the same DOM node between renders, preventing the input from losing focus.
  const chatDialogContent = (
    <div className={`
      fixed bottom-24 left-4 z-50 w-110 h-[70vh] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)]
      transition-all duration-400 ease-out origin-bottom-right
      ${isOpen && !isExpanded 
        ? 'scale-100 opacity-100 translate-y-0 translate-x-0' 
        : 'scale-75 opacity-0 translate-y-8 translate-x-4 pointer-events-none'
      }
    `}>
      <div className={`
        w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden
        transform transition-all duration-400 ease-out
        ${isOpen && !isExpanded ? 'scale-100 rotate-0' : 'scale-95 rotate-1'}
        ${isDarkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
      `}>
        {/* Header */}
        <div className={`
          px-6 py-4 border-b flex items-center justify-between
          transition-all duration-300 ease-out
          ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
        `}>
          <div className="flex items-center space-x-3">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-300 ease-out transform hover:scale-110
              ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'}
            `}>
              <Bot size={16} className="text-white transition-transform duration-200" />
            </div>
            <div className="transition-all duration-300 ease-out">
              <h3 className={`font-semibold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Chat Assistant
              </h3>
              <p className={`text-xs transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`
                p-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span className="text-sm transition-transform duration-300 ease-out">
                {isDarkMode ? '🌞' : '🌙'}
              </span>
            </button>
            <button
              onClick={handleExpand}
              disabled={isAnimating}
              className={`
                p-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }
                ${isAnimating ? 'animate-pulse' : ''}
              `}
            >
              <Maximize2 size={16} className="transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`
          flex-1 overflow-y-auto p-4 space-y-4
          transition-all duration-300 ease-out
          ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}
        `}>
          {messages.map((message, index) => (
            <AnimatedMessage key={message.id} message={message} index={index} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`
          p-4 border-t transition-all duration-300 ease-out
          ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}>
          <div className={`
            flex items-center space-x-2 p-2 rounded-xl border transition-all duration-300 ease-out
            hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500/20
            ${isDarkMode 
              ? 'border-gray-600 bg-gray-700 hover:border-gray-500' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}>
            <input
              ref={chatInputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`
                flex-1 bg-transparent outline-none text-sm transition-all duration-200
                ${isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}
              `}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`
                p-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${inputText.trim()
                  ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg') + ' text-white'
                  : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                }
              `}
            >
              <Send size={16} className="transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Convert FullPageChat from a nested component to a JSX element for the same reason.
  const fullPageChatContent = (
    <div className={`
      fixed inset-0 z-50 flex flex-col
      transition-all duration-500 ease-out
      ${isExpanded 
        ? 'scale-100 opacity-100 backdrop-blur-sm' 
        : 'scale-95 opacity-0 pointer-events-none'
      }
      ${isDarkMode ? 'bg-gray-900' : 'bg-white'}
    `}>
      {/* Backdrop overlay */}
      <div className={`
        absolute inset-0 transition-opacity duration-500 ease-out
        ${isExpanded ? 'opacity-100' : 'opacity-0'}
        ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'}
      `} />
      
      {/* Content */}
      <div className={`
        relative z-10 flex flex-col h-full
        transform transition-all duration-500 ease-out
        ${isExpanded ? 'translate-y-0' : 'translate-y-full'}
      `}>
        {/* Header */}
        <div className={`
          px-6 py-4 border-b flex items-center justify-between
          transition-all duration-300 ease-out
          ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
        `}>
          <div className="flex items-center space-x-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-300 ease-out transform hover:scale-110
              ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'}
            `}>
              <Bot size={20} className="text-white transition-transform duration-200" />
            </div>
            <div className="transition-all duration-300 ease-out">
              <h3 className={`text-lg font-semibold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Chat Assistant
              </h3>
              <p className={`text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Online • Available 24/7
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`
                p-3 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span className="text-lg transition-transform duration-300 ease-out">
                {isDarkMode ? '🌞' : '🌙'}
              </span>
            </button>
            <button
              onClick={handleMinimize}
              disabled={isAnimating}
              className={`
                p-3 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }
                ${isAnimating ? 'animate-pulse' : ''}
              `}
            >
              <Minimize2 size={20} className="transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`
          flex-1 overflow-y-auto p-6 space-y-6 overflow-x-hidden
          transition-all duration-300 ease-out
          ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}
        `}>
          {messages.map((message, index) => (
            <AnimatedFullMessage key={message.id} message={message} index={index} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`
          p-6 border-t transition-all duration-300 ease-out
          ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}>
          <div className={`
            flex items-center space-x-4 p-2 rounded-2xl border transition-all duration-300 ease-out
            hover:shadow-lg focus-within:shadow-lg focus-within:ring-2 focus-within:ring-blue-500/20
            ${isDarkMode 
              ? 'border-gray-600 bg-gray-700 hover:border-gray-500' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}>
            <input
              ref={fullInputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`
                flex-1 bg-transparent outline-none transition-all duration-200
                ${isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}
              `}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`
                p-3 rounded-xl transition-all duration-300 ease-out transform hover:scale-110 active:scale-95
                ${inputText.trim()
                  ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg') + ' text-white'
                  : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                }
              `}
            >
              <Send size={20} className="transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`transition-all duration-500 ease-out ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Chat Components */}
      <FloatingButton />
      {/* Render compact chat only when open and not expanded */}
      {isOpen && !isExpanded && chatDialogContent}
      {/* Render full-page chat only when expanded */}
      {isExpanded && fullPageChatContent}
    </div>
  );
};

export default FloatingChatBot;