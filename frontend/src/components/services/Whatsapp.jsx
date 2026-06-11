import React, { useState } from "react";
import { MessageSquareText, FileArchive, File, ExternalLink, ImageIcon, FileText, Link2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpandableSection from "../utils/Expandable";
import ImageViewer  from "../utils/ImageViewer";
const MediaItem = ({ item, onClick, isScreenshot = false }) => {
  const fileExt = item.filename?.split(".").pop().toLowerCase();
  const isImage = isScreenshot || ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);
  const isZip = fileExt === "zip";

  const FilePreview = () => (
    <div className="flex flex-col items-center">
      {isZip ? (
        <FileArchive className="h-10 w-10 text-signal-warn" />
      ) : (
        <File className="h-10 w-10 text-pf-whatsapp" />
      )}
      <span className="text-xs text-paper-300 truncate max-w-full font-mono">{item.filename}</span>
      <a
        href={item.url}
        download
        className="mt-2 px-3 py-1 bg-pf-whatsapp text-[#fdf3ee] text-xs rounded-lg hover:bg-pf-whatsapp/90 transition"
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
      className={`relative group rounded-xl overflow-hidden ${isImage ? 'cursor-pointer' : ''} bg-ink-780/50 aspect-square flex items-center justify-center`}
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
            <span className="text-paper-50 text-sm font-medium">View Full</span>
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
      <div className="text-center text-sm text-mute my-4 bg-ink-820/30 py-1 rounded-full font-mono">
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
        isIncoming ? "bg-ink-780/80" : "bg-pf-whatsapp/90"
      }`}>
        <p className={isIncoming ? "text-paper-100" : "text-[#fdf3ee]"}>{message.message}</p>
        <span className={`text-xs mt-1 block font-mono ${
          isIncoming ? "text-mute" : "text-paper-100"
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

  if (!chat) return <p className="text-mute">No chat data available</p>;

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
      className="w-full justify-between text-pf-whatsapp hover:text-pf-whatsapp hover:bg-ink-780/50 font-medium"
    >
      <span className="flex items-center">
        {icon}
        {text}
      </span>
    </Button>
  );

  return (
    <Card className="bg-ink-820 p-6 rounded-xl shadow-lg mt-6 border border-pf-whatsapp/20 text-paper-50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-pf-whatsapp font-serif">
          {chat.receiverUsername}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-ink-820/50 rounded-xl p-4 backdrop-blur-sm border border-ink-700/50">
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
          <div className="bg-ink-820/50 rounded-xl p-4 backdrop-blur-sm border border-ink-700/50">
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

        <div className="bg-ink-820/50 rounded-xl p-4 backdrop-blur-sm border border-ink-700/50">
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
                <p className="text-mute text-sm col-span-3 text-center py-2">No media files</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-ink-820/50 rounded-xl p-4 backdrop-blur-sm border border-ink-700/50">
          {renderSectionButton(
            <FileText className="mr-2 h-5 w-5" />,
            `Documents (${chat.files.docs?.length || 0})`,
            "docs"
          )}
          {expandedSections.docs && (
            <div className="mt-4 space-y-3">
              {chat.files.docs?.length > 0 ? (
                chat.files.docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-ink-780/50 transition-colors">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-3 text-pf-whatsapp" />
                      <span className="text-sm text-paper-300 truncate max-w-[250px] font-mono">{doc.filename}</span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pf-whatsapp hover:text-pf-whatsapp text-sm flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-mute text-sm text-center py-2">No documents available</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-ink-820/50 rounded-xl p-4 backdrop-blur-sm border border-ink-700/50">
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
                    className="flex items-center p-2 rounded-lg hover:bg-ink-780/50 transition-colors group"
                  >
                    <Link2 className="h-4 w-4 mr-2 text-mute group-hover:text-pf-whatsapp" />
                    <span className="text-sm text-paper-300 group-hover:text-pf-whatsapp truncate font-mono">{link}</span>
                    <ExternalLink className="h-4 w-4 ml-2 text-mute group-hover:text-pf-whatsapp" />
                  </a>
                ))
              ) : (
                <p className="text-mute text-sm text-center py-2">No links available</p>
              )}
            </div>
          )}
        </div>

        {selectedImage && <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} />}
      </CardContent>
    </Card>
  );
};

export default WhatsAppChat;