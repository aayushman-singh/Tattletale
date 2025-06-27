import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, User, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const formatDate = (dateString) => {
  try {
    const date = new Date(Number(dateString));
    return date.toLocaleString();
  } catch (error) {
    console.error('Error parsing date:', error);
    return 'Invalid Date';
  }
};

const GmailOutUsers = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);

  if (!users || users.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-gray-400">No email data available</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <UserCard 
            key={user.email} 
            user={user} 
            onSelect={() => setSelectedUser(user)}
            onEmailSelect={(email) => setSelectedEmail(email)}
          />
        ))}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-400">
                {selectedUser.email}'s Emails
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <UserDetails user={selectedUser} onEmailSelect={(email) => setSelectedEmail(email)} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Details Modal */}
      {selectedEmail && (
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl bg-gray-900 text-gray-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-400">
                Email Details
              </DialogTitle>
            </DialogHeader>
            <EmailDetails email={selectedEmail} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect, onEmailSelect }) => {
  const [showAllEmails, setShowAllEmails] = useState(false);
  const displayedEmails = showAllEmails ? user.emails : user.emails.slice(0, 3);

  return (
    <GlassCard className="bg-gradient-to-br from-gray-900/50 to-blue-900/50">
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer" 
        onClick={onSelect}
      >
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-semibold text-white truncate max-w-[180px]">
            {user.email}
          </h3>
        </div>
        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
          {user.emails.length} emails
        </span>
      </div>

      <div className="space-y-3">
        {displayedEmails.map((email, index) => (
          <EmailPreview 
            key={index} 
            email={email} 
            onSelect={() => onEmailSelect(email)}
          />
        ))}
      </div>

      {user.emails.length > 3 && (
        <button
          onClick={() => setShowAllEmails(!showAllEmails)}
          className="text-blue-400 hover:text-blue-300 text-xs mt-3 flex items-center"
        >
          {showAllEmails ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all {user.emails.length} emails
            </>
          )}
        </button>
      )}
    </GlassCard>
  );
};

const EmailPreview = ({ email, onSelect }) => {
  return (
    <GlassCard 
      onClick={onSelect}
      className="bg-gray-800/50 hover:bg-gray-800/70 transition-colors duration-200 cursor-pointer p-3"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-blue-400 truncate">
            {email.metadata?.subject || "No Subject"}
          </h4>
          <p className="text-xs text-gray-400 mt-1 truncate">
            From: {email.metadata?.from || "Unknown"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(email.internalDate)}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
      </div>
    </GlassCard>
  );
};

const UserDetails = ({ user, onEmailSelect }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-900 to-gray-800 p-6 rounded-lg shadow-lg border border-blue-700/20">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-blue-500 text-white text-2xl">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-white">{user.email}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <User className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-sm">Gmail Account</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {user.emails.map((email, index) => (
            <EmailCard 
              key={index} 
              email={email} 
              onSelect={() => onEmailSelect(email)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const EmailCard = ({ email, onSelect }) => {
  return (
    <GlassCard 
      onClick={onSelect}
      className="bg-gray-800/40 hover:bg-gray-800/60 transition-colors duration-200 cursor-pointer p-4"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-blue-400">
            {email.metadata?.subject || "No Subject"}
          </h4>
          <div className="text-gray-300 text-sm mt-2 space-y-1">
            <p><strong>From:</strong> {email.metadata?.from || "Unknown"}</p>
            <p><strong>To:</strong> {email.metadata?.to || "Unknown"}</p>
            <p><strong>Date:</strong> {formatDate(email.internalDate)}</p>
          </div>
          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
            {email.snippet}
          </p>
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-blue-400">
                {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <ChevronDown className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
      </div>
    </GlassCard>
  );
};

const EmailDetails = ({ email }) => {
  const Attachment = ({ attachment }) => (
    <div className="bg-gray-700/50 p-3 rounded-md text-white text-sm mt-2">
      <p><strong>Filename:</strong> {attachment.filename}</p>
      <p><strong>Type:</strong> {attachment.mimeType}</p>
      <p><strong>Size:</strong> {Math.round(attachment.size / 1024)} KB</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400">
        {email.metadata?.subject || "No Subject"}
      </h3>
      
      <div className="text-gray-300 text-sm space-y-2">
        <p><strong>From:</strong> {email.metadata?.from || "Unknown"}</p>
        <p><strong>To:</strong> {email.metadata?.to || "Unknown"}</p>
        {email.metadata?.cc && <p><strong>CC:</strong> {email.metadata.cc}</p>}
        {email.metadata?.bcc && <p><strong>BCC:</strong> {email.metadata.bcc}</p>}
        <p><strong>Date:</strong> {formatDate(email.internalDate)}</p>
      </div>

      <div className="bg-gray-800/40 p-4 rounded-lg mt-4">
        <p className="text-gray-300 whitespace-pre-wrap">{email.snippet}</p>
      </div>

      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-blue-400 font-semibold mb-2">
            Attachments ({email.attachments.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {email.attachments.map((attachment, index) => (
              <Attachment key={index} attachment={attachment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailOutUsers;