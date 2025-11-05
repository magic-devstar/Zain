import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

const AttachmentViewer = ({ attachments }) => {
  const origin = import.meta.env.VITE_BACKEND_URL;

  const handleFileAction = async (fileUrl) => {
    try {
      if (fileUrl.startsWith('http') || fileUrl.startsWith('https')) {
        window.open(fileUrl, '_blank');
      } else {
        window.open(`${origin}${fileUrl}`, '_blank');
      }
    } catch (error) {
      console.error('Error handling file action:', error);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Attachments</h3>
      {attachments && attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <span className="text-sm font-medium">{attachment.file.split('/').pop()}</span>
              <div>
                {attachment.file && (
                  <button
                    onClick={() => handleFileAction(attachment.file)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No attachments found.</p>
      )}
    </div>
  );
};

export default AttachmentViewer; 