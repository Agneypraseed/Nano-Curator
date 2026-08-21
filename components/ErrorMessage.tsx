import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <p className="min-w-0 whitespace-pre-wrap">{message}</p>
      <button
        type="button"
        onClick={() => void copyError()}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-current/20 px-2 py-1 text-xs font-semibold transition hover:bg-black/5"
        aria-label="Copy error details"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};
