import React, { useState, useRef } from "react";
import { AiFillQuestionCircle } from "react-icons/ai";
import { HiOutlineDocumentArrowUp, HiXMark } from "react-icons/hi2";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import api from "../../utils/api";
import toast from "react-hot-toast";

const HelpSupport = () => {
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    description: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset the file input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 1. Create the support ticket (without attachments)
      const ticketRes = await api.post("common/api/support-tickets/", {
        title: formData.title,
        type: formData.type,
        description: formData.description,
      });

      const ticketId = ticketRes.data.id;

      // 2. If files are selected, upload them via your custom attachment API
      if (uploadedFiles.length > 0) {
        const form = new FormData();
        form.append("reference_type", "supportticket");
        form.append("id", ticketId);

        uploadedFiles.forEach(file => {
          form.append("images", file);
        });

        await api.post("/common/api/attachments/attach_to_reference/", form, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
      toast.success("Support ticket submitted successfully.");
      // Reset form
      setFormData({ title: "", type: "", description: "" });
      setUploadedFiles([]);

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit ticket.");
    }
    finally {
      setUploading(false);
    }
  };

  return (
    <div className="help-support">
      {/* Header Section */}
      <div className="flex flex-col mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">
          Create Support Request
        </h1>
        <div className="text-gray-500 space-y-1 mt-2">
          <p className="text-sm">
            Create a support request for any issues you are having.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-400 p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 flex gap-2 items-center">
            Support Tickets
            <span data-btnbelowtooltip="Create Support Tickets here, for any type of issue or any queries">
              <AiFillQuestionCircle className="text-primary text-lg" />
            </span>
          </h1>
        </div>

        <div onSubmit={handleSubmit}>
          {/* Ticket Name & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Ticket Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter here"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Request Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select</option>
                <option value="ISSUE">ISSUE</option>
                <option value="FEATURE REQUEST">FEATURE REQUEST</option>
                <option value="GENERAL INQUIRY">GENERAL INQUIRY</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Type Here"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-32"
            />
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Upload Files</label>
            <div
              className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center cursor-pointer hover:bg-gray-50"
              onClick={handleFileClick}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadedFiles.length === 0 ? (
                <>
                  <div className="text-primary mb-2 text-center flex items-center justify-center text-4xl">
                    <HiOutlineDocumentArrowUp />
                  </div>
                  <p className="text-gray-500">Files to be uploaded</p>
                  <p className="text-sm text-gray-400">Click to upload or drag and drop files here</p>
                </>
              ) : (
                <div className="w-full">
                  <div className="text-primary mb-4 text-center flex items-center justify-center text-2xl">
                    <HiOutlineDocumentArrowUp />
                    <span className="ml-2 text-lg">Upload more files</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-80 overflow-auto">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
                        <div className="flex items-center overflow-hidden">
                          <div className="text-gray-600 mr-2">
                            <HiOutlineDocumentArrowUp />
                          </div>
                          <span className="text-sm truncate">{file.name}</span>
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
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <PrimaryBtn onClick={handleSubmit} disabled={uploading} >Submit Ticket</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;