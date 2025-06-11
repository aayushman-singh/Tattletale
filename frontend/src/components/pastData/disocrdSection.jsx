import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, ExternalLink, ImageIcon, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const DiscordChatsDisplay = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || apiData.length === 0) {
    return <p className="text-gray-400">No user data available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiData.map((user) => (
          <UserCard key={user.username} user={user} onSelect={() => setSelectedUser(user)} />
        ))}
      </div>
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-indigo-400">
                {selectedUser.username}'s Discord Chats
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <DiscordChats chats={selectedUser.chats} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect }) => {
  return (
    <GlassCard onClick={onSelect} className="cursor-pointer bg-gray-800 text-gray-100">
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.username}`} alt={user.username} />
          <AvatarFallback><User className="w-8 h-8 text-indigo-400" /></AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold text-gray-100">{user.username}</h3>
          <p className="text-sm text-gray-400">Discord User</p>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>Chats: {user.chats?.length || 0}</span>
      </div>
    </GlassCard>
  );
};

const DiscordChats = ({ chats }) => {
  return (
    <div className="space-y-6">
      {chats.map((chat, index) => (
        <DiscordChat key={index} chat={chat} />
      ))}
    </div>
  );
};

const DiscordChat = ({ chat }) => {
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  const [isChatLogsVisible, setIsChatLogsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [chatLogs, setChatLogs] = useState("");
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const toggleMedia = () => setIsMediaExpanded(!isMediaExpanded);
  const toggleChatLogs = () => setIsChatLogsVisible(!isChatLogsVisible);
  const openImageViewer = (image) => setSelectedImage(image);
  const closeImageViewer = () => setSelectedImage(null);

  const fetchChatLogs = async () => {
    if (isChatLogsVisible) {
      setIsChatLogsVisible(false);
      return;
    }

    setIsLogsLoading(true);
    try {
      // Simulate API call to fetch chat logs in selected language
      // Replace with actual API call in your implementation
      const response = await new Promise(resolve => 
        setTimeout(() => resolve({ 
          data: `Chat logs for ${chat.receiverUsername} in ${selectedLanguage}...`
        }), 500)
      );
      setChatLogs(response.data);
      setIsChatLogsVisible(true);
    } catch (error) {
      console.error("Error fetching chat logs:", error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  return (
    <GlassCard className="bg-gradient-to-br from-indigo-900 to-gray-800 text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${chat.receiverUsername}`} alt={chat.receiverUsername} />
            <AvatarFallback>{chat.receiverUsername.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-bold text-white">{chat.receiverUsername}</h3>
        </div>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="bg-gray-700 text-white text-sm rounded-lg p-2 border border-gray-600"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
        </select>
      </div>

      <div className="space-y-4">
        {chat.screenshots && chat.screenshots.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <button
              onClick={toggleMedia}
              className="flex items-center justify-between w-full text-indigo-400 hover:text-indigo-300 transition-all duration-200 group"
              aria-expanded={isMediaExpanded}
            >
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span className="font-medium">Media Gallery ({chat.screenshots.length})</span>
              </div>
              {isMediaExpanded ? (
                <ChevronUp className="h-5 w-5 transition-transform duration-200" />
              ) : (
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              )}
            </button>

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4 transition-all duration-300 ease-in-out ${
                isMediaExpanded
                  ? "opacity-100 max-h-[1000px]"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              {chat.screenshots.map((mediaFile, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-lg overflow-hidden cursor-pointer bg-gray-700/50 aspect-square"
                  onClick={() => openImageViewer(mediaFile)}
                >
                  <img
                    src={mediaFile}
                    alt={`Media ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-3">
                    <span className="text-white text-sm font-medium">View Full</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={fetchChatLogs}
            className="inline-flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group"
          >
            <span className="font-medium">
              {isChatLogsVisible ? "Close Chat History" : "View Chat History"}
            </span>
            <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <a
            href={chat.chats}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors duration-200"
          >
            Open Chat Log
          </a>
        </div>
      </div>

      {isChatLogsVisible && (
        <div className="bg-gray-800/50 rounded-xl p-4 mt-4 overflow-auto max-h-64">
          {isLogsLoading ? (
            <p className="text-indigo-300">Loading chat logs...</p>
          ) : (
            <pre className="text-gray-300 whitespace-pre-wrap">
              {chatLogs}
            </pre>
          )}
        </div>
      )}

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
              className="absolute -top-2 -right-2 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-lg"
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default DiscordChatsDisplay;