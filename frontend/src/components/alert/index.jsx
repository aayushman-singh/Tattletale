import React from "react";
import { XCircle, CheckCircle } from "lucide-react";

const Alert = ({ type, message, onClose }) => {
  const alertStyles = {
    success: "border-signal-ok",
    error: "border-signal-err",
    info: "border-signal-info",
    warning: "border-signal-warn",
  };

  const icon = {
    success: <CheckCircle className="text-signal-ok" />,
    error: <XCircle className="text-signal-err" />,
    info: <XCircle className="text-signal-info" />,
    warning: <XCircle className="text-signal-warn" />,
  };

  return (
    <div
      className={`fixed top-[74px] right-[22px] z-[95] flex items-center gap-3 p-4 border-l-[3px] rounded-sm bg-ink-820 text-paper-50 ${alertStyles[type]} shadow-2xl max-w-[360px]`}
    >
      <div className="mr-3">{icon[type]}</div>
      <div className="flex-1">
        <p className="font-semibold">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-3 text-paper-50 hover:text-paper-300 transition-transform transform hover:scale-110"
      >
        ✕
      </button>
    </div>
  );
};

export default Alert;
