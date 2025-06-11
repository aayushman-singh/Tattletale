import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, ExternalLink, Image, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const MastodonPostsDisplay = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || apiData.length === 0) {
    return <p className="text-gray-400">No user data available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiData.map((user, index) => (
          <UserCard key={index} user={user} onSelect={() => setSelectedUser(user)} />
        ))}
      </div>
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] bg-gray-900 text-gray-100 flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b border-gray-700 flex-shrink-0">
              <DialogTitle className="text-2xl font-bold text-purple-400">
                {selectedUser.fullName || selectedUser.name}'s Mastodon Profile
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden px-6 pb-6">
             <ScrollArea className="h-[calc(90vh-80px)] pr-4 overflow-y-auto">
                <div className="py-4">
                  <MastodonProfile user={selectedUser} />
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect }) => {
  const feedCount = [user.feed, user.feed_1, user.feed_2, user.feed_3].filter(Boolean).length;
  
  return (
    <GlassCard onClick={onSelect} className="cursor-pointer bg-gray-800 text-gray-100">
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={user.profile_pic} alt={user.name} />
          <AvatarFallback><User className="w-8 h-8 text-purple-400" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gray-100 truncate">
            {user.fullName || user.name}
          </h3>
          <p className="text-sm text-gray-400 truncate">@{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.server}</p>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>Feeds: {feedCount}</span>
        <span className="text-purple-400">Mastodon</span>
      </div>
    </GlassCard>
  );
};

const MastodonProfile = ({ user }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isFeedExpanded, setIsFeedExpanded] = useState(false);

  const feeds = [
    { label: "Main Feed", url: user.feed },
    { label: "Feed 1", url: user.feed_1 },
    { label: "Feed 2", url: user.feed_2 },
    { label: "Feed 3", url: user.feed_3 }
  ].filter(feed => feed.url);

  const toggleFeed = () => setIsFeedExpanded(!isFeedExpanded);
  const openImageViewer = (image) => setSelectedImage(image);
  const closeImageViewer = () => setSelectedImage(null);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <GlassCard className="bg-gradient-to-br overflow-auto from-purple-900 to-gray-800 text-gray-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-purple-500 flex-shrink-0">
            <img
              src={user.profile_pic}
              alt={user.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full bg-gray-600 rounded-full items-center justify-center hidden">
              <User className="w-10 h-10 text-purple-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {user.fullName || user.name}
            </h2>
            <p className="text-purple-300 text-lg truncate">@{user.name}</p>
            <div className="flex items-center space-x-4 mt-2 flex-wrap">
              <a
                href={user.profile}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 hover:text-purple-200 text-sm flex items-center space-x-1 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>View Profile</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-gray-500 text-sm">•</span>
              <span className="text-gray-300 text-sm truncate">{user.server}</span>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {user.lastUpdated && (
          <div className="text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
            <span className="font-medium">Last updated:</span> {new Date(user.lastUpdated).toLocaleString()}
          </div>
        )}
      </GlassCard>

      {/* Feeds Section */}
      {feeds.length > 0 && (
        <GlassCard className="bg-gray-800/50 backdrop-blur-sm border overflow-auto border-gray-700/50">
          <button
            onClick={toggleFeed}
            className="flex items-center justify-between w-full text-purple-400 hover:text-purple-300 transition-all duration-200 font-medium"
            aria-expanded={isFeedExpanded}
          >
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5" />
              <span>Feed Images ({feeds.length})</span>
            </div>
            {isFeedExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>

          <div
            className={`mt-4 transition-all duration-300 ease-in-out ${
              isFeedExpanded
                ? "opacity-100 max-h-[2000px]"
                : "opacity-0 max-h-0 overflow-hidden"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {feeds.map((feed, idx) => (
                <div 
                  key={idx} 
                  className="group relative rounded-lg overflow-hidden cursor-pointer bg-gray-700/30 hover:bg-gray-700/50 transition-all duration-200"
                  onClick={() => openImageViewer(feed.url)}
                >
                  <div className="aspect-video w-full">
                    <img
                      src={feed.url}
                      alt={feed.label}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNGI1NTYzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-4">
                    <span className="text-white text-sm font-medium">{feed.label}</span>
                    <span className="text-white text-xs bg-black/40 px-2 py-1 rounded">View Full</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <GlassCard className="bg-gray-800/30">
        <div className="flex justify-between items-center">
          <a
            href={user.logs}
            className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Download Logs</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          <div className="text-sm text-gray-400">
            <span className="bg-purple-900/30 px-3 py-1 rounded-full">
              Mastodon Profile
            </span>
          </div>
        </div>
      </GlassCard>

     {selectedImage && (
  <div
    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    onClick={closeImageViewer}
  >
    <div
      className="relative max-w-6xl w-full max-h-[90vh] overflow-auto bg-gray-900 rounded-lg shadow-lg"
      onClick={(e) => e.stopPropagation()} // prevent modal close on image click
    >
      <img
        src={selectedImage}
        alt="Full size feed"
        className="w-full h-auto object-contain"
      />
      <button
        onClick={closeImageViewer}
        className="absolute top-2 right-2 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors duration-200 shadow-md"
        aria-label="Close image viewer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
)}

    </div>
  );
};

export default MastodonPostsDisplay;