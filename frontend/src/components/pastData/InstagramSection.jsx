import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Instagram,
  Users,
  UserPlus,
  Heart,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import GlassCard from "@/components/ui/Glass-Card";

const InstagramUsersViewer = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
    return <p className="text-gray-400">No user data available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {apiData.map((user, index) => {
        if (!user || !user._id || !user.profile) {
          return (
            <GlassCard key={index} className="bg-red-900 text-white p-4">
              Invalid user data
            </GlassCard>
          );
        }

        return (
          <UserCard
            key={user._id}
            user={user}
            onSelect={() => setSelectedUser(user)}
          />
        );
      })}

      {selectedUser && (
        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="max-w-4xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {selectedUser.profile.full_name}'s Profile
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <RenderInstagramData instagramData={selectedUser} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect }) => {
  const profile = user?.profile;

  if (!profile) {
    return (
      <GlassCard className="bg-red-800 text-white p-4">
        User profile not found
      </GlassCard>
    );
  }

  return (
    <GlassCard
      onClick={onSelect}
      className="cursor-pointer bg-gray-800 text-gray-100"
    >
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={profile.profile_pic_url} alt={user.username} />
          <AvatarFallback>
            <Instagram className="w-8 h-8 text-pink-400" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold text-gray-100">
            {profile.username || "Unknown"}
          </h3>
          <p className="text-sm text-gray-400">
            {profile.full_name || "No name"}
          </p>
        </div>
      </div>
      <p className="text-gray-300 mb-4 line-clamp-2">
        {profile.biography || "No bio available"}
      </p>
      <div className="flex justify-between text-sm text-gray-400">
        <span>Followers: {profile.follower_count ?? "?"}</span>
        <span>Following: {profile.following_count ?? "?"}</span>
      </div>
    </GlassCard>
  );
};

const PostCard = ({ post }) => (
  <GlassCard className="bg-gray-800 text-gray-100">
    {post.type === "Video" ? (
      <video controls className="w-full h-48 object-cover rounded-lg mb-4">
        <source src={post.videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    ) : (
      <img
        src={post.displayUrl}
        alt={`Post ${post.id}`}
        className="w-full h-48 object-cover rounded-lg mb-4"
      />
    )}
    <p className="text-gray-300 mb-2 line-clamp-2">{post.caption}</p>
    <div className="flex justify-between text-sm text-gray-400">
      <span>
        <Heart className="inline w-4 h-4 mr-1 text-pink-400" />{" "}
        {post.likesCount}
      </span>
      <span>
        <MessageCircle className="inline w-4 h-4 mr-1 text-blue-400" />{" "}
        {post.commentsCount}
      </span>
    </div>
  </GlassCard>
);

const RenderInstagramData = ({ instagramData }) => {
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  if (!instagramData) return null;

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <GlassCard className="bg-gray-800 text-gray-100">
        <div className="flex flex-col md:flex-row md:space-x-6 items-center md:items-start">
          <Avatar className="w-32 h-32">
            <AvatarImage
              src={instagramData.profile.profilePicUrl}
              alt={`${instagramData.profile.username}'s profile`}
            />
            <AvatarFallback>
              <Instagram className="w-20 h-20 text-pink-400" />
            </AvatarFallback>
          </Avatar>
          <div className="mt-4 md:mt-0 text-center md:text-left">
            <h3 className="text-2xl font-bold text-gray-100">
              {instagramData.profile.fullName}
            </h3>
            <p className="text-lg text-pink-400">
              @{instagramData.profile.username}
            </p>
            <p className="mt-2 text-gray-300">
              {instagramData.profile.biography}
            </p>
            <div className="flex justify-center md:justify-start space-x-6 mt-4">
              <p className="text-sm text-gray-300">
                <span className="font-bold text-pink-400">
                  {instagramData.profile.follower_count}
                </span>{" "}
                followers
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-bold text-pink-400">
                  {instagramData.profile.following_count}
                </span>{" "}
                following
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-bold text-pink-400">
                  {instagramData.profile.mediaCount}
                </span>{" "}
                posts
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Posts Section */}
      <div>
        <h4 className="text-2xl font-bold text-pink-400 mb-6">Posts</h4>
        {instagramData.posts && instagramData.posts.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pr-4">
              {instagramData.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-gray-400">No posts available.</p>
        )}
      </div>

      {/* Timeline Section */}
      <div>
        <h4 className="text-2xl font-bold text-pink-400 mb-6">Timeline</h4>
        <div className="space-y-6">
          {[1, 2, 3].map((timelineNum) =>
            instagramData[`timeline_${timelineNum}`] ? (
              <GlassCard
                key={timelineNum}
                className="bg-gray-800 text-gray-100"
              >
                <img
                  src={instagramData[`timeline_${timelineNum}`]}
                  alt={`Timeline screenshot ${timelineNum}`}
                  className="w-full rounded-lg"
                />
                <p className="text-pink-400 text-sm mt-2">
                  Timeline Screenshot {timelineNum}
                </p>
              </GlassCard>
            ) : null
          )}
        </div>
      </div>

      {/* Followers Section */}
      <div>
        <button
          onClick={() => setShowFollowers(!showFollowers)}
          className="flex items-center space-x-2 text-2xl font-bold text-pink-400 mb-4"
        >
          <span>Followers</span>
          <ChevronDown
            className={`w-6 h-6 transform transition-transform ${
              showFollowers ? "rotate-180" : ""
            }`}
          />
        </button>
        {showFollowers && instagramData.followers?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {instagramData.followers.map((follower, index) => (
              <GlassCard
                key={index}
                className="flex flex-col items-center space-y-2 bg-gray-800 text-gray-100"
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={follower.profile_pic_url}
                    alt={follower.username}
                  />
                  <AvatarFallback>
                    <Users className="w-8 h-8 text-pink-400" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-gray-300 text-sm text-center">
                  {follower.username}
                </span>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Following Section */}
      <div>
        <button
          onClick={() => setShowFollowing(!showFollowing)}
          className="flex items-center space-x-2 text-2xl font-bold text-pink-400 mb-4"
        >
          <span>Following</span>
          <ChevronDown
            className={`w-6 h-6 transform transition-transform ${
              showFollowing ? "rotate-180" : ""
            }`}
          />
        </button>
        {showFollowing && instagramData.following?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {instagramData.following.map((following, index) => (
              <GlassCard
                key={index}
                className="flex flex-col items-center space-y-2 bg-gray-800 text-gray-100"
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={following.profilePicUrl}
                    alt={following.username}
                  />
                  <AvatarFallback>
                    <UserPlus className="w-8 h-8 text-pink-400" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-gray-300 text-sm text-center">
                  {following.username}
                </span>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Chats Section */}
      <div>
        <h4 className="text-2xl font-bold text-pink-400 mb-6">Chats</h4>
        <div className="space-y-6">
          {instagramData?.chats?.length > 0 ? (
            instagramData.chats.map((chat, index) => (
              <GlassCard key={index} className="bg-gray-800 text-gray-100">
                <p className="text-gray-300 text-sm">
                  <span className="font-bold">Receiver: </span>
                  {chat.receiverUsername}
                </p>
                <div className="mt-2">
                  <span className="text-pink-400 text-sm">Chat URL: </span>
                  <a
                    href={chat.chatLogURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    Download Chat
                  </a>
                </div>
                {chat.screenshots?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-pink-400 text-sm mb-2">Screenshots:</p>
                    <div className="grid grid-cols-2 gap-4">
                      {chat.screenshots.map((screenshot, i) => (
                        <div key={i} className="space-y-2">
                          <a
                            href={screenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline"
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${i + 1}`}
                              className="rounded-lg shadow-md w-full h-auto"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            ))
          ) : (
            <p className="text-gray-400">No chats available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramUsersViewer;
