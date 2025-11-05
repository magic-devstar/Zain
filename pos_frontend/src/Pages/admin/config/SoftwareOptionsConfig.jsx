import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPreferredSoftwareOptions, updatePreferredSoftwareOptions } from '../../../api/platformConfig';
import { toast } from 'react-hot-toast';
import Spinner from '../../../Components/Common/Spinner';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import { FaArrowLeft, FaCog, FaPlus, FaTrash } from 'react-icons/fa';

const SoftwareOptionsConfig = () => {
  const location = useLocation();
  const basePath = location.pathname.split('/platform-config')[0];
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [softwareOptions, setSoftwareOptions] = useState([""]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const options = await getPreferredSoftwareOptions();
        setSoftwareOptions((Array.isArray(options) && options.length ? options : [""]));
      } catch (err) {
        console.error(err);
        setSoftwareOptions([""]);
        toast.error('Failed to load software options');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChangeOptionAt = (index, value) => {
    const next = [...softwareOptions];
    next[index] = value;
    setSoftwareOptions(next);
  };

  const onAddOption = () => {
    setSoftwareOptions([...(softwareOptions || []), ""]);
  };

  const onRemoveOption = (index) => {
    const next = (softwareOptions || []).filter((_, i) => i !== index);
    setSoftwareOptions(next.length ? next : [""]);
  };

  const saveSoftwareOptions = async () => {
    const cleaned = (softwareOptions || [])
      .map(o => String(o || '').trim())
      .filter(Boolean);
    
    if (!cleaned.length) {
      toast.error('Add at least one option');
      return;
    }
    
    setSaving(true);
    try {
      const saved = await updatePreferredSoftwareOptions(cleaned);
      setSoftwareOptions(saved.length ? saved : [""]);
      toast.success('Preferred software options updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update preferred software options');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to={`${basePath}/platform-config`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaArrowLeft className="text-lg" />
            <span>Back to Configuration</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FaCog className="text-2xl text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Software Options</h1>
            <p className="text-gray-600">Configure preferred software options</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[60vh] flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Preferred Software Options</h2>
            <p className="text-sm text-gray-600 mb-6">
              These options populate selection lists on registration and store creation.
            </p>
            
            <div className="space-y-3">
              {softwareOptions.map((val, idx) => (
                <div key={`opt-${idx}`} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Standup, Sit-down, Reach Truck"
                      value={val}
                      onChange={(e) => onChangeOptionAt(idx, e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveOption(idx)}
                    className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={loading}
                    title="Remove option"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={onAddOption}
                className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                disabled={loading}
              >
                <FaPlus className="text-sm" />
                Add Option
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Preview</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">These options will appear in dropdowns:</p>
              <div className="flex flex-wrap gap-2">
                {softwareOptions
                  .filter(option => option.trim())
                  .map((option, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm">
                      {option}
                    </span>
                  ))}
                {softwareOptions.filter(option => option.trim()).length === 0 && (
                  <span className="text-gray-400 text-sm italic">No options added yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <PrimaryBtn 
              onClick={saveSoftwareOptions}
              disabled={saving || loading}
            >
                {saving ? 'Saving...' : 'Save Software Options'}
            </PrimaryBtn>   
          </div>
        </div>
      )}
    </div>
  );
};

export default SoftwareOptionsConfig;
