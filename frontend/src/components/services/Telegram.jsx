

import React, { useState } from "react";
import axios from "axios";
import {
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ImageIcon,
  Languages,
  MessageSquareText,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MediaItem = ({ item, onClick }) => {
  const handleClick = () => {
    onClick(item);
  };

  return (
    <div 
      className="relative group rounded-xl overflow-hidden cursor-pointer bg-gray-700/50 aspect-square flex items-center justify-center"
      onClick={handleClick}
    >
      <img
        src={item}
        alt="Media file"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-3">
        <span className="text-white text-sm font-medium">View Full</span>
      </div>
    </div>
  );
};

const TelegramChat = ({ chat, index }) => {
  const [expandedSections, setExpandedSections] = useState({
    media: false,
    logs: false
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [chatLogs, setChatLogs] = useState(null);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openImageViewer = (image) => setSelectedImage(image);
  const closeImageViewer = () => setSelectedImage(null);

  const translateText = async (text, targetLanguage) => {
    const apiKey = "AIzaSyAKce7w0WL4J-pkYl3fXDwIJNzBNOCaGoE";
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    try {
      const response = await axios.post(url, {
        q: text,
        target: targetLanguage,
      });
      return response.data.data.translations[0].translatedText;
    } catch (error) {
      console.error("Error translating text:", error);
      return "Translation failed.";
    }
  };

  const handleTranslate = async () => {
    if (!chatLogs || !selectedLanguage) return;
    setIsTranslating(true);
    const translated = await translateText(chatLogs, selectedLanguage);
    setTranslatedText(translated);
    setIsTranslating(false);
  };

  const fetchChatLogs = async () => {
    if (!expandedSections.logs) {
      try {
        setIsLogsLoading(true);
        const response = await fetch(chat.logs);
        if (!response.ok) {
          throw new Error(`Failed to fetch chat logs: ${response.statusText}`);
        }
        const text = await response.text();
        setChatLogs(text);
        setTranslatedText(null);
      } catch (error) {
        console.error(error.message);
        setChatLogs("Failed to load chat logs.");
      } finally {
        setIsLogsLoading(false);
      }
    }
    toggleSection("logs");
  };

  const renderSectionButton = (icon, text, section, customAction = null) => (
    <Button
      variant="ghost"
      onClick={customAction || (() => toggleSection(section))}
      className="w-full justify-between text-blue-400 hover:text-blue-300 hover:bg-gray-700/50 font-medium"
    >
      <span className="flex items-center">
        {icon}
        {text}
      </span>
    </Button>
  );

  return (
    <Card className="bg-gradient-to-br from-blue-700 to-gray-800 p-6 rounded-xl shadow-lg mt-6 border border-blue-600/20 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-blue-50 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {chat.receiverUsername.charAt(0).toUpperCase()}
            </span>
          </div>
          <span>{chat.receiverUsername}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {chat.media_files && chat.media_files.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
            {renderSectionButton(
              <ImageIcon className="mr-2 h-5 w-5" />,
              `Media Gallery (${chat.media_files.length})`,
              "media"
            )}
            {expandedSections.media && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {chat.media_files.map((mediaFile, idx) => (
                  <MediaItem
                    key={idx}
                    item={mediaFile}
                    onClick={openImageViewer}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          {renderSectionButton(
            <MessageSquareText className="mr-2 h-5 w-5" />,
            "Chat History",
            "logs",
            fetchChatLogs
          )}
          {expandedSections.logs && (
            <div className="mt-4 space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  {isLogsLoading ? (
                    <p className="text-blue-300">Loading chat logs...</p>
                  ) : (
                    <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                      {translatedText || chatLogs}
                    </pre>
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex items-center justify-between bg-gray-900/30 rounded-lg p-3">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating || isLogsLoading}
                    className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Languages className="h-4 w-4" />
                    <span className="font-medium">
                      {isTranslating ? "Translating..." : "Translate"}
                    </span>
                  </button>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-gray-800 text-white text-sm rounded-lg p-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="bn">Bengali</option>
                    <option value="kn">Kannada</option>
                    <option value="mr">Marathi</option>
                    <option value="te">Telugu</option>
                  </select>
                </div>
                <a
                  href={chat.logs}
                  className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200 group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Open Original</span>
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-5xl w-full">
            <img
              src={selectedImage}
              alt="Full size media"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={closeImageViewer}
              className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-lg"
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

const TelegramChats = ({ chats }) => {
  return (
    <div className="space-y-6">
      {chats.map((chat, index) => (
        <TelegramChat key={index} chat={chat} index={index} />
      ))}
    </div>
  );
};

export default TelegramChats;