import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send, Bot, User, Loader2, FileInput } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = "http://localhost:5005/api/chatbot";

const ChatbotAvatar = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!userInput.trim() || !fileUploaded) return;

    const userMessage = { sender: "user", text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('query', userInput);

      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const botReply = response.data.reply;
      const botMessage = { sender: "bot", text: botReply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        sender: "bot",
        text: "Error processing request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setFileUploaded(true);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `PDF file selected: ${file.name} - You can now ask questions.` }
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  if (!isChatbotOpen) return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <button
        onClick={toggleChatbot}
        className="bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 transition-all duration-300 ease-in-out transform hover:scale-110"
        aria-label="Open Chatbot"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-[100] transition-opacity duration-500 ease-in-out opacity-100">
      <div className="bg-gray-900 text-white w-96 h-screen shadow-2xl border-l border-gray-700 p-4 flex flex-col rounded-lg backdrop-blur-sm transition-all duration-500 ease-in-out transform">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center text-blue-400">
            <Bot className="mr-2" /> PDF Chatbot
          </h2>
          <button
            onClick={toggleChatbot}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close Chatbot"
          >
            <X size={24} />
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-2 px-2">
          <label className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg cursor-pointer">
            <FileInput className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">Upload PDF:</span>
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
            <Button asChild variant="ghost" className="text-gray-200 hover:bg-gray-700">
              <span>{selectedFile ? selectedFile.name : "Choose File"}</span>
            </Button>
          </label>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-grow overflow-auto p-2">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-end space-x-2">
                  {message.sender === "bot" && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`p-3 rounded-2xl max-w-xs ${message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"} shadow-md`}>
                    {message.text}
                  </div>
                  {message.sender === "user" && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input & Send Button */}
        <div className="flex items-center space-x-2 p-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow bg-gray-800 text-gray-200 border-gray-700 focus:ring-blue-500 rounded-lg"
          />
          <Button
            onClick={sendMessage}
            className={`bg-blue-600 hover:bg-blue-700 text-white ${loading || !fileUploaded ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading || !fileUploaded}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotAvatar;
