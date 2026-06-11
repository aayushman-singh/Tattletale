import React from 'react';

const formatDate = (dateString) => {
  try {
    const date = new Date(Number(dateString)); // Convert timestamp to a valid date
    return date.toLocaleString();
  } catch (error) {
    console.error('Error parsing date:', error);
    return 'Invalid Date';
  }
};

const Attachment = ({ attachment }) => (
  <div className="bg-ink-780 p-2 rounded-md text-paper-50 text-sm">
    <p><strong>Filename:</strong> <span className="font-mono">{attachment.filename}</span></p>
    <p><strong>Type:</strong> <span className="font-mono">{attachment.mimeType}</span></p>
    <p><strong>Size:</strong> <span className="font-mono">{attachment.size} bytes</span></p>
  </div>
);

const EmailDetails = ({ email }) => (
  <div className="bg-ink-820 p-4 rounded-lg shadow-md border border-ink-700 mb-4">
    <h4 className="text-lg font-bold font-serif text-rust-300 mb-2">{email.metadata?.subject || "No Subject"}</h4>
    <div className="text-paper-300 text-sm">
      <p><strong>From:</strong> <span className="font-mono">{email.metadata?.from || "Unknown"}</span></p>
      <p><strong>To:</strong> <span className="font-mono">{email.metadata?.to || "Unknown"}</span></p>
      {email.metadata?.cc && <p><strong>CC:</strong> <span className="font-mono">{email.metadata.cc}</span></p>}
      {email.metadata?.bcc && <p><strong>BCC:</strong> <span className="font-mono">{email.metadata.bcc}</span></p>}
    </div>
    <p className="text-mute mt-2"><strong>Date:</strong> <span className="font-mono">{formatDate(email.internalDate)}</span></p>
    <p className="text-faint mt-2"><strong>Snippet:</strong> {email.snippet}</p>
    {email.attachments && email.attachments.length > 0 && (
      <div className="mt-4">
        <h5 className="text-pf-google font-semibold">Attachments:</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {email.attachments.map((attachment, index) => (
            <Attachment key={index} attachment={attachment} />
          ))}
        </div>
      </div>
    )}
  </div>
);

const GmailOutUser = ({ user }) => (
  <div className="bg-ink-900 p-6 rounded-xl shadow-lg border border-ink-700">
    <h3 className="text-xl font-bold font-serif text-paper-50 mb-4"><span className="font-mono">{user.email}</span></h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {user.emails.map((email, index) => (
        <EmailDetails key={index} email={email} />
      ))}
    </div>
  </div>
);

const GmailOutUsers = ({ users }) => {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return <p className="text-paper-50">No email data available</p>;
  }

  return (
    <div className="space-y-6">
      {users.map((user, index) => (
        <GmailOutUser key={index} user={user} />
      ))}
    </div>
  );
};

export default GmailOutUsers;
