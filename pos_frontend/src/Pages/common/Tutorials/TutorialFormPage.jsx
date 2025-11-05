import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { AiFillQuestionCircle } from "react-icons/ai";
import { HiOutlineDocumentArrowUp, HiXMark } from "react-icons/hi2";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import { createTutorial, updateTutorial } from "../../../utils/apis/tutorialUtils";

const TutorialFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchTutorial = async () => {
      if (!isEditing) return;
      
      try {
        const response = await api.get(`/common/api/tutorials/${id}/`);
        const data = response.data;
        
        setFormData({
          title: data.title || "",
          description: data.description || "",
          content: data.content || "",
        });

        // Set existing attachments if any
        if (data.attachments && data.attachments.length > 0) {
          setUploadedFiles(data.attachments.map(att => ({
            id: att.id,
            name: att.name || att.file.split('/').pop(),
            isExisting: true,
            file: att.file,
            url: `${api.defaults.baseURL.replace("/api/v1", "")}${att.file}`
          })));
        }
      } catch (error) {
        toast.error("Failed to fetch tutorial");
        navigate("/tutorials");
      } finally {
        setLoading(false);
      }
    };

    fetchTutorial();
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [
        ...prev,
        ...newFiles.map(file => ({
          id: Date.now() + Math.random().toString(36).substring(2),
          name: file.name,
          file: file,
          isExisting: false,
          url: URL.createObjectURL(file)
        }))
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = async (indexToRemove) => {
    const file = uploadedFiles[indexToRemove];
    
    try {
      if (file.isExisting) {
        // Delete from server first
        await api.delete(`/common/api/attachments/${file.id}/delete/`);
        toast.success('Attachment deleted successfully!');
      } else {
        // For new files, just revoke the object URL
        URL.revokeObjectURL(file.url);
      }
      
      // Remove from state
      setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Prepare tutorial data with attachments
      const tutorialData = {
        ...formData,
        attachments: uploadedFiles.filter(f => !f.isExisting).map(f => f.file)
      };

      if (isEditing) {
        await updateTutorial(id, tutorialData);
      } else {
        await createTutorial(tutorialData);
      }

      navigate(-1);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Tutorial" : "Create Tutorial"}
          </h1>
          <p className="text-gray-600">
            {isEditing ? "Update tutorial details" : "Add a new tutorial to help users"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800 flex gap-2 items-center">
              Tutorial Details
              <span data-btnbelowtooltip="Create tutorials to help users understand the system">
                <AiFillQuestionCircle className="text-primary text-lg" />
              </span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter title"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter a brief description"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-24"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Enter detailed tutorial content"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-48"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Attachments</label>
              <div
                onClick={handleFileClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <HiOutlineDocumentArrowUp className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload files
                </p>
                <p className="text-xs text-gray-500">
                  Support all file types
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Uploaded Files
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
                        <div className="flex items-center overflow-hidden">
                          <div className="text-gray-600 mr-2">
                            <HiOutlineDocumentArrowUp />
                          </div>
                          <span className="text-sm truncate">
                            {file.isExisting ? (
                              <a 
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {file.name}
                              </a>
                            ) : (
                              file.name
                            )}
                          </span>
                        </div>
                        <button
                          disabled={uploading}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiXMark />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <SecondaryBtn
                type="button"
                disabled={uploading}
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </SecondaryBtn>
              <PrimaryBtn type="submit" disabled={uploading}>
                {uploading 
                  ? "Submitting..." 
                  : (isEditing ? "Update Tutorial" : "Create Tutorial")
                }
              </PrimaryBtn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TutorialFormPage; 