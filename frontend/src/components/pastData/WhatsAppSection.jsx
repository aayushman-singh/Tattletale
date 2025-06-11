import React, { useState } from "react";
import { 
  MessageSquareText, 
  FileArchive, 
  File, 
  ExternalLink, 
  ImageIcon, 
  FileText, 
  Link2, 
  Image,
  User,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const WhatsAppChatsViewer = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || apiData.length === 0) {
    return <p className="text-gray-400">No user data available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiData.map((user) => (
          <UserCard key={user._id} user={user} onSelect={() => setSelectedUser(user)} />
        ))}
      </div>
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-green-400">
                {selectedUser.username}'s WhatsApp Chats
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <WhatsAppChats chats={selectedUser.chats} />
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
          <AvatarFallback><User className="w-8 h-8 text-green-400" /></AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold text-gray-100">{user.username}</h3>
          <p className="text-sm text-gray-400">WhatsApp User</p>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>Chats: {user.chats?.length || 0}</span>
      </div>
    </GlassCard>
  );
};

const WhatsAppChats = ({ chats }) => {
  return (
    <div className="space-y-6">
      {chats.map((chat, index) => (
        <WhatsAppChat key={index} chat={chat} />
      ))}
    </div>
  );
};

const MediaItem = ({ item, onClick, isScreenshot = false }) => {
  const fileExt = item.filename?.split(".").pop().toLowerCase();
  const isImage = isScreenshot || ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);
  const isZip = fileExt === "zip";

  const FilePreview = () => (
    <div className="flex flex-col items-center">
      {isZip ? (
        <FileArchive className="h-10 w-10 text-yellow-400" />
      ) : (
        <File className="h-10 w-10 text-blue-400" />
      )}
      <span className="text-xs text-gray-300 truncate max-w-full">{item.filename}</span>
      <a
        href={item.url}
        download
        className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-400 transition"
      >
        Download
      </a>
    </div>
  );

  const handleClick = () => {
    if (isImage) {
      onClick(item.url);
    }
  };

  return (
    <div 
      className={`relative group rounded-xl overflow-hidden ${isImage ? 'cursor-pointer' : ''} bg-gray-700/50 aspect-square flex items-center justify-center`}
      onClick={handleClick}
    >
      {isImage ? (
        <>
          <img
            src={item.url}
            alt={item.filename || "Screenshot"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-3">
            <span className="text-white text-sm font-medium">View Full</span>
          </div>
        </>
      ) : (
        <FilePreview />
      )}
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const isISODate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dateString);
  };

  if (message.type === "date") {
    return (
      <div className="text-center text-sm text-gray-400 my-4 bg-gray-800/30 py-1 rounded-full">
        {isISODate(message.message) 
          ? new Date(message.message).toLocaleDateString() 
          : message.message}
      </div>
    );
  }

  const isIncoming = message.type === "Incoming";
  return (
    <div className={`flex ${isIncoming ? "justify-start" : "justify-end"}`}>
      <div className={`rounded-2xl p-3 max-w-[70%] shadow-sm ${
        isIncoming ? "bg-gray-700/80" : "bg-green-600/90"
      }`}>
        <p className={isIncoming ? "text-gray-100" : "text-white"}>{message.message}</p>
        <span className={`text-xs mt-1 block ${
          isIncoming ? "text-gray-400" : "text-green-100"
        }`}>{message.timestamp || "N/A"}</span>
      </div>
    </div>
  );
};

const WhatsAppChat = ({ chat }) => {
  const [expandedSections, setExpandedSections] = useState({
    messages: false,
    screenshots: false,
    media: false,
    docs: false,
    links: false
  });
  const [selectedImage, setSelectedImage] = useState(null);

  if (!chat) return <p className="text-gray-400">No chat data available</p>;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSectionButton = (icon, text, section) => (
    <Button
      variant="ghost"
      onClick={() => toggleSection(section)}
      className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
    >
      <span className="flex items-center">
        {icon}
        {text}
      </span>
      {expandedSections[section] ? (
        <ChevronUp className="h-5 w-5" />
      ) : (
        <ChevronDown className="h-5 w-5" />
      )}
    </Button>
  );

  return (
    <GlassCard className="bg-gradient-to-br from-green-900 to-gray-800 text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${chat.receiverUsername}`} alt={chat.receiverUsername} />
            <AvatarFallback>{chat.receiverUsername.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-bold text-white">{chat.receiverUsername}</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          {renderSectionButton(
            <MessageSquareText className="mr-2 h-5 w-5" />,
            `Chat Messages (${chat.messages.length})`,
            "messages"
          )}
          {expandedSections.messages && (
            <ScrollArea className="h-[400px] pr-4 mt-4">
              {chat.messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </ScrollArea>
          )}
        </div>

        {chat.screenshots?.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
            {renderSectionButton(
              <Image className="mr-2 h-5 w-5" />,
              `Screenshots (${chat.screenshots.length})`,
              "screenshots"
            )}
            {expandedSections.screenshots && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {chat.screenshots.map((screenshot, idx) => (
                  <MediaItem
                    key={idx}
                    item={{ url: screenshot, filename: `Screenshot ${idx + 1}` }}
                    onClick={setSelectedImage}
                    isScreenshot={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          {renderSectionButton(
            <ImageIcon className="mr-2 h-5 w-5" />,
            `Media (${chat.files.media?.length || 0})`,
            "media"
          )}
          {expandedSections.media && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {chat.files.media?.length > 0 ? (
                chat.files.media.map((item, idx) => (
                  <MediaItem 
                    key={idx} 
                    item={item} 
                    onClick={setSelectedImage}
                  />
                ))
              ) : (
                <p className="text-gray-400 text-sm col-span-3 text-center py-2">No media files</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          {renderSectionButton(
            <FileText className="mr-2 h-5 w-5" />,
            `Documents (${chat.files.docs?.length || 0})`,
            "docs"
          )}
          {expandedSections.docs && (
            <div className="mt-4 space-y-3">
              {chat.files.docs?.length > 0 ? (
                chat.files.docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-3 text-green-400" />
                      <span className="text-sm text-gray-200 truncate max-w-[250px]">{doc.filename}</span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 text-sm flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No documents available</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          {renderSectionButton(
            <Link2 className="mr-2 h-5 w-5" />,
            `Links (${chat.files.links?.length || 0})`,
            "links"
          )}
          {expandedSections.links && (
            <div className="mt-4 space-y-2">
              {chat.files.links?.length > 0 ? (
                chat.files.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
                  >
                    <Link2 className="h-4 w-4 mr-2 text-gray-400 group-hover:text-green-400" />
                    <span className="text-sm text-gray-200 group-hover:text-green-400 truncate">{link}</span>
                    <ExternalLink className="h-4 w-4 ml-2 text-gray-400 group-hover:text-green-400" />
                  </a>
                ))
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No links available</p>
              )}
            </div>
          )}
        </div>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-5xl w-full">
              <img
                src={selectedImage}
                alt="Full size media"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors duration-200 shadow-lg"
                aria-label="Close image viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default WhatsAppChatsViewer;