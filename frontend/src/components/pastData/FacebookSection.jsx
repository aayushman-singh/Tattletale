import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, ImageIcon, MessageCircle, ExternalLink, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const FacebookDataViewer = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || apiData.length === 0) {
    return <p className="text-mute">No user data available.</p>;
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
          <DialogContent className="max-w-4xl h-[90vh] bg-ink-900 text-paper-300 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-serif text-pf-facebook">
                {selectedUser.username}'s Facebook Data
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <FacebookData facebookData={selectedUser} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect }) => {
  return (
    <GlassCard onClick={onSelect} className="cursor-pointer bg-ink-820 text-paper-300">
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={user.profile} alt={user.username} />
          <AvatarFallback><User className="w-8 h-8 text-pf-facebook" /></AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold font-serif text-paper-50">{user.username}</h3>
          <p className="text-sm text-mute">Facebook User</p>
        </div>
      </div>
      <div className="flex justify-between text-sm font-mono text-mute">
        <span>Posts: {user.posts?.length || 0}</span>
        <span>Friends: {user.friends_list?.length || 0}</span>
      </div>
    </GlassCard>
  );
};

const FacebookData = ({ facebookData }) => {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isPostsExpanded, setIsPostsExpanded] = useState(false);
  const [isMessagesExpanded, setIsMessagesExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!facebookData) return <p className="text-mute">No data available.</p>;

  const timelines = [
    facebookData.timeline_1,
    facebookData.timeline_2,
    facebookData.timeline_3,
  ].filter(Boolean);

  const friendsList = facebookData.friends_list || [];
  const posts = facebookData.posts || [];
  const messages = Object.keys(facebookData)
    .filter((key) => key.startsWith("messages_"))
    .map((key) => facebookData[key]);

  const toggleTimeline = () => setIsTimelineExpanded(!isTimelineExpanded);
  const togglePosts = () => setIsPostsExpanded(!isPostsExpanded);
  const toggleMessages = () => setIsMessagesExpanded(!isMessagesExpanded);
  const openImageViewer = (image) => setSelectedImage(image);
  const closeImageViewer = () => setSelectedImage(null);

  return (
    <div className="space-y-6">
      <GlassCard className="bg-ink-820 text-paper-300">
        <div className="flex items-center space-x-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={facebookData.profile} alt={facebookData.username} />
            <AvatarFallback><User className="w-12 h-12 text-pf-facebook" /></AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold font-serif text-paper-50">{facebookData.username}</h2>
            <p className="text-pf-facebook">Facebook User</p>
          </div>
        </div>
      </GlassCard>

      <ExpandableSection
        title="Timelines"
        data={timelines}
        isExpanded={isTimelineExpanded}
        toggleExpand={toggleTimeline}
        onItemClick={openImageViewer}
      />

      <ExpandableSection
        title="Posts"
        data={posts.map((post) => post.s3Url)}
        isExpanded={isPostsExpanded}
        toggleExpand={togglePosts}
        onItemClick={openImageViewer}
      />

      <ExpandableSection
        title="Messages"
        data={messages}
        isExpanded={isMessagesExpanded}
        toggleExpand={toggleMessages}
        onItemClick={openImageViewer}
      />

      {friendsList.length > 0 && (
        <GlassCard className="bg-ink-820 text-paper-300">
          <h4 className="text-lg font-bold font-serif text-pf-facebook mb-4">Friends:</h4>
          <ScrollArea className="h-64">
            <ul className="space-y-4">
              {friendsList.map((friend, index) => (
                <li key={index} className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={friend.profilePicUrl} alt={friend.userName} />
                    <AvatarFallback><User className="w-6 h-6 text-pf-facebook" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-pf-facebook font-semibold font-mono">{friend.userName}</p>
                    <a
                      href={friend.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rust-300 hover:text-rust-300 underline flex items-center"
                    >
                      View Profile <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </GlassCard>
      )}

      {selectedImage && (
        <ImageViewer image={selectedImage} onClose={closeImageViewer} />
      )}
    </div>
  );
};

const ExpandableSection = ({ title, data, isExpanded, toggleExpand, onItemClick }) => (
  <GlassCard className="bg-ink-820 text-paper-300">
    <button
      onClick={toggleExpand}
      className="flex items-center justify-between w-full text-pf-facebook hover:text-rust-300 transition-all duration-200 group"
      aria-expanded={isExpanded}
    >
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">{`${title} (${data.length})`}</span>
      </div>
      {isExpanded ? <ChevronUp /> : <ChevronDown />}
    </button>

    <div
      className={`grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 transition-all duration-300 ease-in-out ${
        isExpanded ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0 overflow-hidden"
      }`}
    >
      {data.map((item, index) => (
        <div
          key={index}
          className="relative group bg-ink-780/50 rounded-lg cursor-pointer overflow-hidden aspect-video"
          onClick={() => onItemClick(item)}
        >
          <img
            src={item}
            alt={`${title} ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-paper-50 text-sm font-medium">View Full</span>
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

const ImageViewer = ({ image, onClose }) => (
  <div
    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div className="relative max-w-5xl w-full">
      <img
        src={image}
        alt="Full size view"
        className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
      />
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 bg-rust-500 text-[#fdf3ee] p-2 rounded-full hover:bg-rust-400 transition-colors duration-200 shadow-lg"
        aria-label="Close viewer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
);

export default FacebookDataViewer;

