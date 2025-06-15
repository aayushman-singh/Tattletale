import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, ExternalLink, FileText, User, File, Image, Video, Music, Folder, Download, Calendar, HardDrive } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

const GoogleDriveDisplay = ({ apiData }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!apiData || apiData.length === 0) {
    return <p className="text-gray-400">No Drive data available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiData.map((user, index) => (
          <UserCard key={user.email || index} user={user} onSelect={() => setSelectedUser(user)} />
        ))}
      </div>
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-6xl h-[90vh] bg-gray-900 text-gray-100 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-400">
                {selectedUser.email}'s Google Drive Files
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-80px)] overflow-y-auto pr-4">
              <DriveFiles files={selectedUser.driveFiles || []} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const UserCard = ({ user, onSelect }) => {
  const totalFiles = user.driveFiles?.length || 0;
  const totalSize = user.driveFiles?.reduce((acc, file) => acc + (parseInt(file.size) || 0), 0) || 0;
  const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <GlassCard onClick={onSelect} className="cursor-pointer bg-gray-800 text-gray-100">
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.email}`} alt={user.email} />
          <AvatarFallback><User className="w-8 h-8 text-blue-400" /></AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-100 truncate">{user.email}</h3>
          <p className="text-sm text-gray-400">Google Drive User</p>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Files:
          </span>
          <span>{totalFiles}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            Size:
          </span>
          <span>{sizeInMB} MB</span>
        </div>
      </div>
    </GlassCard>
  );
};

const DriveFiles = ({ files }) => {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterType, setFilterType] = useState('all');

  // Ensure files is an array
  const safeFiles = Array.isArray(files) ? files : [];

  if (safeFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No files found</p>
      </div>
    );
  }

  const sortedFiles = [...safeFiles].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'size':
        aValue = parseInt(a.size) || 0;
        bValue = parseInt(b.size) || 0;
        break;
      case 'date':
        aValue = new Date(a.createdTime);
        bValue = new Date(b.createdTime);
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const filteredFiles = sortedFiles.filter(file => {
    if (filterType === 'all') return true;
    return file.mimeType.startsWith(filterType);
  });

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-800/50 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="date">Date</option>
          </select>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Filter:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="application">Documents</option>
          </select>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFiles.map((file, index) => (
          <DriveFile key={index} file={file} />
        ))}
      </div>
    </div>
  );
};

const DriveFile = ({ file }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6 text-green-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-red-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-purple-400" />;
    if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="w-6 h-6 text-yellow-400" />;
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-6 h-6 text-blue-400" />;
    return <File className="w-6 h-6 text-gray-400" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === '0') return 'Unknown size';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileTypeName = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
    if (mimeType.includes('document')) return 'Document';
    if (mimeType.includes('spreadsheet')) return 'Spreadsheet';
    if (mimeType.includes('presentation')) return 'Presentation';
    if (mimeType.includes('pdf')) return 'PDF';
    return 'File';
  };

  const openDetails = () => setIsDetailsOpen(true);
  const closeDetails = () => setIsDetailsOpen(false);

  return (
    <GlassCard className="bg-gradient-to-br from-blue-900/50 to-gray-800/50 text-gray-100">
      <div className="flex items-start space-x-4 mb-4">
        <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-400/30">
          {getFileIcon(file.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-lg font-semibold truncate mb-1">
            {file.name}
          </h4>
          <p className="text-blue-400 text-sm mb-1">
            {getFileTypeName(file.mimeType)}
          </p>
          <p className="text-gray-400 text-xs">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-400">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Created: {new Date(file.createdTime).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          <button
            onClick={openDetails}
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm font-medium flex items-center space-x-1"
          >
            <FileText className="w-4 h-4" />
            <span>Details</span>
          </button>

          <div className="flex space-x-2">
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors duration-200 text-sm font-medium"
              >
                <span>View</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {isDetailsOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeDetails}
        >
          <div
            className="bg-gray-900 p-6 rounded-xl relative max-w-md w-full text-white shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeDetails}
              className="absolute top-4 right-4 bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-lg"
              aria-label="Close details"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-400/30">
                  {getFileIcon(file.mimeType)}
                </div>
                <h3 className="text-xl font-bold truncate">{file.name}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-blue-400 text-sm font-semibold block">File Type</span>
                  <span className="text-gray-300">{getFileTypeName(file.mimeType)}</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-blue-400 text-sm font-semibold block">Size</span>
                  <span className="text-gray-300">{formatFileSize(file.size)}</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-blue-400 text-sm font-semibold block">Created</span>
                  <span className="text-gray-300">{new Date(file.createdTime).toLocaleString()}</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-blue-400 text-sm font-semibold block">MIME Type</span>
                  <span className="text-gray-300 text-sm break-all">{file.mimeType}</span>
                </div>
              </div>

              {file.webViewLink && (
                <div className="pt-4 border-t border-gray-700">
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium"
                  >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default GoogleDriveDisplay;