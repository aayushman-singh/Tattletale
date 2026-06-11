import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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

const Attachment = ({ attachment }) => (
  <div className="bg-ink-780/50 p-2 rounded-md text-paper-50 text-xs">
    <p><strong>Filename:</strong> {attachment.filename}</p>
    <p><strong>Type:</strong> {attachment.mimeType}</p>
    <p><strong>Size:</strong> {Math.round(attachment.size / 1024)} KB</p>
  </div>
);

const EmailPreview = ({ email, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onExpand) {
      onExpand();
    }
  };

  return (
    <GlassCard className="bg-ink-820/50 hover:bg-ink-820/70 transition-colors duration-200">
      <button
        onClick={toggleExpand}
        className="w-full text-left"
      >
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-pf-google truncate">
            {email.metadata?.subject || "No Subject"}
          </h4>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-mute" />
          ) : (
            <ChevronDown className="h-4 w-4 text-mute" />
          )}
        </div>
        <p className="text-xs font-mono text-mute mt-1 truncate">
          From: {email.metadata?.from || "Unknown"}
        </p>
        <p className="text-xs font-mono text-faint mt-1">
          {formatDate(email.internalDate)}
        </p>
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-ink-700/50">
          <div className="text-paper-300 text-xs space-y-1">
            <p><strong>To:</strong> {email.metadata?.to || "Unknown"}</p>
            {email.metadata?.cc && <p><strong>CC:</strong> {email.metadata.cc}</p>}
            {email.metadata?.bcc && <p><strong>BCC:</strong> {email.metadata.bcc}</p>}
          </div>
          <p className="text-mute text-xs mt-2">
            {email.snippet}
          </p>
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-3">
              <h5 className="text-pf-google text-xs font-semibold">Attachments ({email.attachments.length}):</h5>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {email.attachments.slice(0, 2).map((attachment, index) => (
                  <Attachment key={index} attachment={attachment} />
                ))}
              </div>
              {email.attachments.length > 2 && (
                <p className="text-faint text-xs mt-1">
                  +{email.attachments.length - 2} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

const UserCard = ({ user }) => {
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [showAllEmails, setShowAllEmails] = useState(false);

  const displayedEmails = showAllEmails ? user.emails : user.emails.slice(0, 3);

  return (
    <GlassCard className="bg-ink-820">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#d99a32] flex items-center justify-center text-[#fdf3ee] font-bold">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold font-mono text-paper-50 truncate max-w-[180px]">
            {user.email}
          </h3>
        </div>
        <span className="text-xs font-mono bg-pf-google/20 text-pf-google px-2 py-1 rounded-full">
          {user.emails.length} emails
        </span>
      </div>

      <div className="space-y-3">
        {displayedEmails.map((email, index) => (
          <EmailPreview 
            key={index} 
            email={email} 
            onExpand={() => setExpandedEmail(expandedEmail === index ? null : index)}
            isExpanded={expandedEmail === index}
          />
        ))}
      </div>

      {user.emails.length > 3 && (
        <button
          onClick={() => setShowAllEmails(!showAllEmails)}
          className="text-rust-300 hover:text-rust-300 text-xs mt-3 flex items-center"
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

const GmailOutUsers = ({ users }) => {
  if (!users || users.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-mute">No email data available</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user, index) => (
        <UserCard key={index} user={user} />
      ))}
    </div>
  );
};

export default GmailOutUsers;