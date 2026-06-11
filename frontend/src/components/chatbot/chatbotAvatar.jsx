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
        className="bg-rust-500 text-paper-50 rounded-full p-3 shadow-lg hover:bg-rust-400 transition-all duration-300 ease-in-out transform hover:scale-110"
        aria-label="Open Chatbot"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-[100] transition-opacity duration-500 ease-in-out opacity-100">
      <div className="bg-ink-870 text-paper-50 w-96 h-screen shadow-2xl border-l border-ink-700 p-4 flex flex-col rounded-lg backdrop-blur-sm transition-all duration-500 ease-in-out transform">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold font-serif flex items-center text-rust-300">
            <Bot className="mr-2" /> PDF Chatbot
          </h2>
          <button
            onClick={toggleChatbot}
            className="text-mute hover:text-paper-50 transition-colors duration-200"
            aria-label="Close Chatbot"
          >
            <X size={24} />
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-2 px-2">
          <label className="flex items-center space-x-2 bg-ink-820 border border-dashed border-ink-700 p-2 rounded-lg cursor-pointer">
            <FileInput className="w-5 h-5 text-rust-300" />
            <span className="text-paper-300">Upload PDF:</span>
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
            <Button asChild variant="ghost" className="text-paper-100 hover:bg-ink-780">
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
                  <div className={`p-3 rounded-2xl max-w-xs ${message.sender === "user" ? "bg-rust-500 text-[#fdf3ee]" : "bg-ink-780 border border-ink-700 text-paper-100"} shadow-md`}>
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
            className="flex-grow bg-ink-780 text-paper-100 border-ink-700 focus:ring-rust-500/40 focus:border-rust-500 rounded-lg"
          />
          <Button
            onClick={sendMessage}
            className={`bg-rust-500 hover:bg-rust-400 text-[#fdf3ee] ${loading || !fileUploaded ? "opacity-50 cursor-not-allowed" : ""}`}
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
