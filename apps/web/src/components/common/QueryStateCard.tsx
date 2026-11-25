import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

interface QueryStateCardProps {
  mode: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  spinnerColorClass?: string;
}

export const QueryStateCard: React.FC<QueryStateCardProps> = ({
  mode,
  title,
  message,
  onRetry,
  spinnerColorClass = 'border-blue-600',
}) => {
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div
          className={`animate-spin w-8 h-8 border-4 ${spinnerColorClass} border-t-transparent rounded-full`}
        />
        <p className="text-xs text-slate-500 font-medium">{message || 'Loading data...'}</p>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 max-w-xl mx-auto">
          <AlertTriangle size={28} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">{title || 'Failed to Load Data'}</h2>
          <p className="text-sm text-red-700">{message || 'An unexpected error occurred.'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 max-w-xl mx-auto">
        <Inbox size={28} className="text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">{title || 'No Data Available'}</h2>
        <p className="text-sm text-slate-500">
          {message || 'The server returned an empty response for this view.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};
