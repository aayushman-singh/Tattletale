import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, ExternalLink, MessageCircle, Heart, Repeat, Quote } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const XTweetsDisplay = ({ apiData }) => {
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
              <DialogTitle className="text-2xl font-bold font-serif text-pf-x">
                {selectedUser.username}'s Tweets
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <XTweets tweets={selectedUser.tweets} timeline={selectedUser.timeline} />
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
          <AvatarImage src={user.tweets[0]?.user.profile_image_url_https} alt={user.username} />
          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold font-serif text-paper-50">{user.username}</h3>
          <p className="text-sm font-mono text-mute">@{user.tweets[0]?.user.screen_name}</p>
        </div>
      </div>
      <div className="flex justify-between text-sm font-mono text-mute">
        <span>Tweets: {user.tweets?.length || 0}</span>
      </div>
    </GlassCard>
  );
};

const XTweets = ({ tweets, timeline }) => {
  if (!tweets || tweets.length === 0) {
    return <p className="text-mute">No tweets available for this user.</p>;
  }

  return (
    <div className="space-y-6">
      {tweets.map((tweet, index) => (
        <Tweet key={index} tweet={tweet} />
      ))}
      {timeline && (
        <GlassCard className="bg-ink-820 text-paper-300">
          <h3 className="text-lg font-bold font-serif text-pf-x mb-2">Timeline</h3>
          <a
            href={timeline}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rust-300 hover:text-rust-300 inline-flex items-center space-x-2"
          >
            <span>View Timeline</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </GlassCard>
      )}
    </div>
  );
};

const Tweet = ({ tweet }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <GlassCard className="bg-ink-820 text-paper-300">
      <div className="flex items-center mb-4">
        <Avatar className="w-10 h-10 mr-3">
          <AvatarImage src={tweet.user.profile_image_url_https} alt={tweet.user.name} />
          <AvatarFallback>{tweet.user.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold font-serif text-paper-50">{tweet.user.name}</h4>
          <p className="text-sm font-mono text-mute">@{tweet.user.screen_name}</p>
        </div>
      </div>
      <p className="text-paper-300 mb-4">{tweet.full_text}</p>
      <div className="flex justify-between text-sm font-mono text-mute mb-4">
        <span className="flex items-center">
          <MessageCircle className="w-4 h-4 mr-1" />
          {tweet.reply_count}
        </span>
        <span className="flex items-center">
          <Repeat className="w-4 h-4 mr-1" />
          {tweet.retweet_count}
        </span>
        <span className="flex items-center">
          <Heart className="w-4 h-4 mr-1" />
          {tweet.favorite_count}
        </span>
        <span className="flex items-center">
          <Quote className="w-4 h-4 mr-1" />
          {tweet.quote_count}
        </span>
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center text-rust-300 hover:text-rust-300 transition-colors duration-200"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-1" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            Show more
          </>
        )}
      </button>
      {isExpanded && (
        <div className="mt-4 space-y-2 text-sm text-paper-300">
          <p><strong>Created At:</strong> {tweet.created_at}</p>
          <p><strong>Language:</strong> {tweet.lang}</p>
          <p><strong>Views:</strong> {tweet.views_count || "N/A"}</p>
          <p><strong>Possibly Sensitive:</strong> {tweet.possibly_sensitive ? "Yes" : "No"}</p>
          <div className="mt-2">
            <strong>Entities:</strong>
            <ul className="list-disc ml-5 mt-1">
              <li>
                <strong>Hashtags:</strong>{" "}
                {tweet.entities.hashtags.length
                  ? tweet.entities.hashtags.map(tag => `#${tag.text}`).join(", ")
                  : "None"}
              </li>
              <li>
                <strong>URLs:</strong>{" "}
                {tweet.entities.urls.length
                  ? tweet.entities.urls.map(url => (
                      <a
                        key={url.url}
                        href={url.expanded_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rust-300 hover:underline"
                      >
                        {url.display_url}
                      </a>
                    )).reduce((prev, curr) => [prev, ", ", curr])
                  : "None"}
              </li>
              <li>
                <strong>User Mentions:</strong>{" "}
                {tweet.entities.user_mentions.length
                  ? tweet.entities.user_mentions.map(mention => `@${mention.screen_name}`).join(", ")
                  : "None"}
              </li>
            </ul>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default XTweetsDisplay;

