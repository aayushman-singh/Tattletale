import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Reusable components
const ExpandableSection = ({ title, children, isOpen, onToggle }) => (
  <Card className="border border-gray-600 bg-gray-800 mt-10">
    <CardHeader
      className="flex flex-row justify-between items-center cursor-pointer p-4"
      onClick={onToggle}
    >
      <CardTitle className="text-pink-500">{title}</CardTitle>
      {isOpen ? <ChevronUp className="text-pink-500" /> : <ChevronDown className="text-pink-500" />}
    </CardHeader>
    {isOpen && <CardContent className="p-4">{children}</CardContent>}
  </Card>
);

const ImageViewer = ({ image, onClose }) => (
  <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="relative max-w-5xl w-full">
      <img src={image} alt="Full size media" className="w-full h-auto max-h-[90vh] object-contain rounded-lg" />
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-lg"
        aria-label="Close image viewer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
);

const UserCard = ({ user, className }) => (
  <Card className={`flex flex-col items-center bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 ${className}`}>
    <img
      src={user.profile_pic_url || "/api/placeholder/64/64"}
      alt={user.username || "Unknown"}
      className="w-16 h-16 rounded-full border-2 border-gray-600"
    />
    <span className="text-white text-sm text-center mt-2">{user.username || "Unknown"}</span>
    <span className="text-gray-400 text-xs">{user.full_name || ""}</span>
  </Card>
);

const RenderInstagramData = ({ instagramData }) => {
  // Consolidated state management
  const [expandedSections, setExpandedSections] = useState({
    timeline: false,
    loginActivity: false,
    followers: false,
    following: false,
    chats: false
  });
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [textContent, setTextContent] = useState("");

  useEffect(() => {
    if (instagramData.login_activity_logs) {
      fetch(instagramData.login_activity_logs)
        .then((response) => response.text())
        .then(setTextContent)
        .catch((error) => console.error("Failed to fetch text content:", error));
    }
  }, [instagramData.login_activity_logs]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleSession = (id) => setExpandedSession(expandedSession === id ? null : id);

  if (!instagramData) return null;

  const renderProfile = () => (
    <div className="flex flex-col md:flex-row md:space-x-6 items-center md:items-start">
      <div className="mt-4 md:mt-0 text-center md:text-left">
        <h3 className="text-2xl font-bold text-white">{instagramData.profile?.full_name || "Unknown"}</h3>
        <p className="text-lg text-pink-400">@{instagramData.profile?.username || "unknown"}</p>
        <p className="mt-2 text-gray-300">{instagramData.profile?.biography || "No bio available"}</p>
        <div className="flex justify-center md:justify-start space-x-6 mt-4">
          {["follower_count", "following_count", "media_count"].map((stat) => (
            <p key={stat} className="text-sm text-gray-300">
              <span className="font-bold text-pink-500">{instagramData.profile?.[stat] || 0}</span>{" "}
              {stat.split("_")[0]}s
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-6">
      {instagramData.timeline?.map((item, index) => {
        const media = item.media;
        if (!media) return null;

        const imageUrl = media.image_versions2?.candidates?.find(
          (img) => img.height === 1350 && img.width === 1080
        )?.url;

        return (
          <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-md cursor-pointer" onClick={() => setSelectedImage(media)}>
            <div className="flex items-center space-x-3 mb-4">
              <img src={media.user?.profile_pic_url} alt={media.user?.username} className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-white font-semibold">{media.user?.username}</p>
                <p className="text-gray-400 text-sm">{media.user?.full_name}</p>
                {media.user?.friendship_status?.following && <p className="text-gray-400 text-xs">Following</p>}
              </div>
            </div>
            <img src={imageUrl} alt={media.accessibility_caption} className="w-full rounded-lg" />
            {media.caption?.text && <p className="text-white text-sm mt-2">{media.caption.text}</p>}
            <div className="flex space-x-4 text-gray-400 text-sm mt-2">
              <p>{media.like_count} Likes</p>
              <p>{media.comment_count} Comments</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLoginActivity = () => (
    <div className="space-y-4">
      {instagramData?.login_activity?.sessions?.map((session) => (
        <Card key={session.id} className={`border ${session.is_current ? "border-green-500" : "border-gray-600"} bg-gray-900`}>
          <CardHeader
            className="flex flex-row justify-between items-center cursor-pointer p-4"
            onClick={() => toggleSession(session.id)}
          >
            <div>
              <CardTitle className="text-white">{session.device}</CardTitle>
              <p className="text-sm text-gray-400">{session.location}</p>
              <p className="text-xs text-gray-500">Last Active: {new Date(session.timestamp).toLocaleString()}</p>
            </div>
            {expandedSession === session.id ? <ChevronUp className="w-5 h-5 text-pink-400" /> : <ChevronDown className="w-5 h-5 text-pink-400" />}
          </CardHeader>
          {expandedSession === session.id && (
            <CardContent className="p-4 text-gray-300 space-y-2">
              <p><span className="font-bold text-pink-500">Login Time:</span> {new Date(session.login_timestamp).toLocaleString()}</p>
              <p><span className="font-bold text-pink-500">User Agent:</span> {session.user_agent}</p>
              <p><span className="font-bold text-pink-500">IP Address:</span> {session.ip_address}</p>
              <p><span className="font-bold text-pink-500">Coordinates:</span> {session.latitude}, {session.longitude}</p>
              {session.is_current && <p className="text-green-400 font-bold">Active Session</p>}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <div className="mt-6 bg-gray-900 p-6 rounded-lg shadow-xl">
      {renderProfile()}

      <ExpandableSection
        title="Timeline"
        isOpen={expandedSections.timeline}
        onToggle={() => toggleSection('timeline')}
      >
        {renderTimeline()}
      </ExpandableSection>

      <ExpandableSection
        title="Login Activity Logs"
        isOpen={expandedSections.loginActivity}
        onToggle={() => toggleSection('loginActivity')}
      >
        {renderLoginActivity()}
      </ExpandableSection>

      <ExpandableSection
        title="Followers"
        isOpen={expandedSections.followers}
        onToggle={() => toggleSection('followers')}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(instagramData.followers || []).map((follower, index) => (
            <UserCard key={index} user={follower} />
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Following"
        isOpen={expandedSections.following}
        onToggle={() => toggleSection('following')}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(instagramData.following || []).map((following, index) => (
            <UserCard key={index} user={following} />
          ))}
        </div>
      </ExpandableSection>

      {selectedImage && <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
};

export default RenderInstagramData;