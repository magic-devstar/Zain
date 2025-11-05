import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../../utils/api';
import AttachmentViewer from '../../../Components/Common/AttachmentViewer';
import BackButton from '../../../Components/Common/BackButton';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TutorialDetail = () => {
  const { id } = useParams();
  const [tutorial, setTutorial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTutorial = async () => {
      try {
        const response = await api.get(`/common/api/tutorials/${id}/`);
        setTutorial(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch tutorial');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutorial();
  }, [id]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (!tutorial) {
    return <div className="flex justify-center items-center h-screen">Tutorial not found</div>;
  }

  return (
    <div className="">
      <div className="flex gap-2 items-center mb-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold break-all">{tutorial.title}</h1>
          <p className="text-gray-600">
            Created by {tutorial.created_by_details?.username || "Unknown"} on {formatDate(tutorial.created_at)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-600 break-all whitespace-pre-wrap">{tutorial.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Content</h3>
            <div className="prose max-w-none text-gray-600 break-all whitespace-pre-wrap">
              {tutorial.content}
            </div>
          </div>

          <AttachmentViewer attachments={tutorial.attachments} />
        </div>
      </div>
    </div>
  );
};

export default TutorialDetail; 