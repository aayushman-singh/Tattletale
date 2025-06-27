import React, { useState } from "react";
import { X, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GlassCard from '@/components/ui/Glass-Card';

export default function TimelineDataViewer({ timelineData }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!timelineData) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-gray-400">No timeline data available</p>
      </GlassCard>
    );
  }

  const timelines = [
    timelineData.timeline,
    timelineData.timeline_1,
    timelineData.timeline_2,
    timelineData.timeline_3,
    timelineData.timeline_4,
    timelineData.timeline_5,
    timelineData.timeline_6,
    timelineData.timeline_7,
    timelineData.timeline_8,
    timelineData.timeline_9,
    timelineData.timeline_10
  ].filter(Boolean);
  
  const openImageViewer = (image, index) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction) => {
    let newIndex = currentImageIndex + direction;
    if (newIndex < 0) newIndex = timelines.length - 1;
    if (newIndex >= timelines.length) newIndex = 0;
    setCurrentImageIndex(newIndex);
    setSelectedImage(timelines[newIndex]);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="bg-gradient-to-br from-gray-900/50 to-blue-900/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-blue-600 text-white">
                {timelineData.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {timelineData.username || 'Unknown User'}
              </h3>
              <div className="flex items-center text-blue-400 text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                <span>Timeline Data ({timelines.length} entries)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {timelines.map((item, index) => (
                <TimelinePreview 
                  key={index} 
                  image={item} 
                  index={index}
                  onClick={() => openImageViewer(item, index)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </GlassCard>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={closeImageViewer}>
          <DialogContent className="max-w-5xl bg-transparent border-none p-0">
            <div className="relative w-full h-full">
              <img
                src={selectedImage}
                alt={`Timeline ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-gray-900/80 px-4 py-2 rounded-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(-1);
                  }}
                  className="text-white hover:text-blue-300 transition-colors duration-200"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <span className="text-white text-sm">
                  {currentImageIndex + 1} / {timelines.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(1);
                  }}
                  className="text-white hover:text-blue-300 transition-colors duration-200"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const TimelinePreview = ({ image, index, onClick }) => {
  return (
    <GlassCard 
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden cursor-pointer bg-gray-700/50 hover:bg-gray-700/70 transition-colors duration-200"
    >
      <div className="aspect-video relative">
        <img
          src={image}
          alt={`Timeline ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-end p-3">
          <span className="text-white text-sm font-medium">Timeline Entry {index + 1}</span>
          <span className="text-blue-300 text-xs mt-1">Click to view</span>
        </div>
      </div>
    </GlassCard>
  );
};