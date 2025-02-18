

import React, { useState } from "react"
import { ChevronDown, ChevronUp, MessageSquareText, X, ExternalLink, ImageIcon, FileText, Link2, Image } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const WhatsAppChat = ({ chat }) => {
  const [isMessagesExpanded, setIsMessagesExpanded] = useState(false)
  const [isScreenshotsExpanded, setIsScreenshotsExpanded] = useState(false)
  const [isMediaExpanded, setIsMediaExpanded] = useState(false)
  const [isDocsExpanded, setIsDocsExpanded] = useState(false)
  const [isLinksExpanded, setIsLinksExpanded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  if (!chat) return <p className="text-gray-400">No chat data available</p>

  const toggleMessages = () => setIsMessagesExpanded(!isMessagesExpanded)
  const toggleScreenshots = () => setIsScreenshotsExpanded(!isScreenshotsExpanded)
  const toggleMedia = () => setIsMediaExpanded(!isMediaExpanded)
  const toggleDocs = () => setIsDocsExpanded(!isDocsExpanded)
  const toggleLinks = () => setIsLinksExpanded(!isLinksExpanded)
  const openImageViewer = (image) => setSelectedImage(image)
  const closeImageViewer = () => setSelectedImage(null)
  const isISODate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dateString);
  };
  return (
    <Card className="bg-gradient-to-br from-green-700 to-gray-800 p-6 rounded-xl shadow-lg mt-6 border border-green-600/20 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-green-50">
          {chat.receiverUsername}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chat Messages Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          <Button
            variant="ghost"
            onClick={toggleMessages}
            className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
          >
            <span className="flex items-center">
              <MessageSquareText className="mr-2 h-5 w-5" />
              Chat Messages ({chat.messages.length})
            </span>
            {isMessagesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          {isMessagesExpanded && (
            <ScrollArea className="h-[400px] pr-4 mt-4">
              {chat.messages.map((message, index) => (
                <div key={index} className="mb-4">
                  {message.type === "date" && (
  <div className="text-center text-sm text-gray-400 my-4 bg-gray-800/30 py-1 rounded-full">
    {isISODate(message.message) 
      ? new Date(message.message).toLocaleDateString() 
      : message.message}
  </div>
)}

                  {message.type === "Incoming" && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700/80 rounded-2xl p-3 max-w-[70%] shadow-sm">
                        <p className="text-gray-100">{message.message}</p>
                        <span className="text-xs text-gray-400 mt-1 block">{message.timestamp || "N/A"}</span>
                      </div>
                    </div>
                  )}
                  {message.type === "Outgoing" && (
                    <div className="flex justify-end">
                      <div className="bg-green-600/90 rounded-2xl p-3 max-w-[70%] shadow-sm">
                        <p className="text-white">{message.message}</p>
                        <span className="text-xs text-green-100 mt-1 block">{message.timestamp || "N/A"}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          )}
        </div>

        {/* Screenshots Section */}
        {chat.screenshots && chat.screenshots.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
            <Button
              variant="ghost"
              onClick={toggleScreenshots}
              className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
            >
              <span className="flex items-center">
                <Image className="mr-2 h-5 w-5" />
                Screenshots ({chat.screenshots.length})
              </span>
              {isScreenshotsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
            {isScreenshotsExpanded && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {chat.screenshots.map((screenshot, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden cursor-pointer bg-gray-700/50 aspect-square"
                    onClick={() => openImageViewer(screenshot)}
                  >
                    <img
                      src={screenshot || "/api/placeholder/400/400"}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-3">
                      <span className="text-white text-sm font-medium">View Full</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Media Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          <Button
            variant="ghost"
            onClick={toggleMedia}
            className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
          >
            <span className="flex items-center">
              <ImageIcon className="mr-2 h-5 w-5" />
              Media ({chat.media.media?.length || 0})
            </span>
            {isMediaExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          {isMediaExpanded && (
            <div className="mt-4">
              {chat.media.media?.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {chat.media.media.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden cursor-pointer bg-gray-700/50 aspect-square"
                      onClick={() => openImageViewer(item)}
                    >
                      <img
                        src={item || "/api/placeholder/400/400"}
                        alt={`Media ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-3">
                        <span className="text-white text-sm font-medium">View Full</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No media files</p>
              )}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          <Button
            variant="ghost"
            onClick={toggleDocs}
            className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
          >
            <span className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Documents ({chat.media.docs?.length || 0})
            </span>
            {isDocsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          {isDocsExpanded && (
            <div className="mt-4">
              {chat.media.docs?.length > 0 ? (
                <div className="space-y-2">
                  {chat.media.docs.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-200">{doc}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No documents</p>
              )}
            </div>
          )}
        </div>

        {/* Links Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
          <Button
            variant="ghost"
            onClick={toggleLinks}
            className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-gray-700/50 font-medium"
          >
            <span className="flex items-center">
              <Link2 className="mr-2 h-5 w-5" />
              Links ({chat.media.links?.length || 0})
            </span>
            {isLinksExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          {isLinksExpanded && (
            <div className="mt-4">
              {chat.media.links?.length > 0 ? (
                <div className="space-y-2">
                  {chat.media.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Link2 className="h-4 w-4 mr-2 text-gray-400 group-hover:text-green-400" />
                      <span className="text-sm text-gray-200 group-hover:text-green-400 truncate">
                        {link}
                      </span>
                      <ExternalLink className="h-4 w-4 ml-2 text-gray-400 group-hover:text-green-400" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No links</p>
              )}
            </div>
          )}
        </div>

        {/* Image Viewer */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" 
            onClick={closeImageViewer}
          >
            <div className="relative max-w-5xl w-full">
              <img
                src={selectedImage || "/api/placeholder/800/600"}
                alt="Full size view"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 bg-green-600 text-white hover:bg-green-700 rounded-full shadow-lg"
                onClick={closeImageViewer}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WhatsAppChat