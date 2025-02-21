import { X } from "lucide-react";

const ImageViewer = ({ image, onClose }) => (
  <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="relative max-w-5xl w-full">
      <img
        src={image}
        alt="Full size media"
        className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
      />
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

export default ImageViewer;
