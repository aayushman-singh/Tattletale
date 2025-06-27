import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText, X, File, Image, Video, Music, Folder, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
  if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
  if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
};

const GoogleDriveUsers = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!users || users.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-gray-400">No drive data available</p>
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
            onFileSelect={(file) => setSelectedFile(file)}
          />
        ))}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-400">
                {selectedUser.email}'s Drive Files
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <UserDetails user={selectedUser} onFileSelect={(file) => setSelectedFile(file)} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-2xl bg-gray-900 text-gray-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-400">
                File Details
              </DialogTitle>
            </DialogHeader>
            <FileDetails file={selectedFile} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect, onFileSelect }) => {
  const [showAllFiles, setShowAllFiles] = useState(false);
  const displayedFiles = showAllFiles ? user.driveFiles : user.driveFiles.slice(0, 3);

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
          {user.driveFiles.length} files
        </span>
      </div>

      <div className="space-y-3">
        {displayedFiles.map((file, index) => (
          <FilePreview 
            key={index} 
            file={file} 
            onSelect={() => onFileSelect(file)}
          />
        ))}
      </div>

      {user.driveFiles.length > 3 && (
        <button
          onClick={() => setShowAllFiles(!showAllFiles)}
          className="text-blue-400 hover:text-blue-300 text-xs mt-3 flex items-center"
        >
          {showAllFiles ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all {user.driveFiles.length} files
            </>
          )}
        </button>
      )}
    </GlassCard>
  );
};

const FilePreview = ({ file, onSelect }) => {
  return (
    <GlassCard 
      onClick={onSelect}
      className="bg-gray-800/50 hover:bg-gray-800/70 transition-colors duration-200 cursor-pointer p-3"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-blue-500/20">
          {getFileIcon(file.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-blue-400 truncate">
            {file.name}
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(file.createdTime).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </GlassCard>
  );
};

const UserDetails = ({ user, onFileSelect }) => {
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
              <span className="text-blue-300 text-sm">Google Drive</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.driveFiles.map((file, index) => (
            <FileCard 
              key={index} 
              file={file} 
              onSelect={() => onFileSelect(file)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const FileCard = ({ file, onSelect }) => {
  return (
    <GlassCard 
      onClick={onSelect}
      className="bg-gray-800/40 hover:bg-gray-800/60 transition-colors duration-200 cursor-pointer p-4"
    >
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-full bg-blue-500/20">
          {getFileIcon(file.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-blue-400 truncate">
            {file.name}
          </h4>
          <div className="text-gray-300 text-sm mt-2 space-y-1">
            <p className="truncate"><strong>Type:</strong> {file.mimeType.split('/').pop()}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
      </div>
    </GlassCard>
  );
};

const FileDetails = ({ file }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-4">
        <div className="p-4 rounded-full bg-blue-500/20">
          {getFileIcon(file.mimeType)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-400">
            {file.name}
          </h3>
          <p className="text-sm text-gray-400">
            {file.mimeType}
          </p>
        </div>
      </div>
      
      <div className="text-gray-300 text-sm space-y-2">
        <p><strong>Created:</strong> {new Date(file.createdTime).toLocaleString()}</p>
        <p><strong>Modified:</strong> {new Date(file.modifiedTime).toLocaleString()}</p>
        <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
        {file.owners && (
          <p><strong>Owners:</strong> {file.owners.map(owner => owner.displayName).join(', ')}</p>
        )}
      </div>

      <div className="mt-6 flex space-x-3">
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
        >
          <span>Open File</span>
          <ExternalLink className="w-4 h-4" />
        </a>
        {file.webContentLink && (
          <a
            href={file.webContentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
          >
            <span>Download</span>
            <FileText className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveUsers;