import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPlatformConfig, updatePlatformConfig } from '../../../api/platformConfig';
import { toast } from 'react-hot-toast';
import Spinner from '../../../Components/Common/Spinner';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import { FaArrowLeft, FaList, FaPlus, FaTrash } from 'react-icons/fa';

const isValidEmail = (email) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(email || '').trim());

const EmailListsConfig = () => {
  const location = useLocation();
  const basePath = location.pathname.split('/platform-config')[0];
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trackingList, setTrackingList] = useState([""]);
  const [maintenanceList, setMaintenanceList] = useState([""]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getPlatformConfig();
        setTrackingList((Array.isArray(data.tracking_emails) && data.tracking_emails.length ? data.tracking_emails : [""]));
        setMaintenanceList((Array.isArray(data.maintenance_emails) && data.maintenance_emails.length ? data.maintenance_emails : [""]));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load email lists');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChangeAt = (setter, list, index, value) => {
    const next = [...list];
    next[index] = value;
    setter(next);
  };

  const onAdd = (setter, list) => {
    setter([...(list || []), ""]);
  };

  const onRemove = (setter, list, index) => {
    const next = (list || []).filter((_, i) => i !== index);
    setter(next.length ? next : [""]);
  };

  const normalizedList = (list) => {
    const cleaned = (list || [])
      .map(e => String(e || '').trim())
      .filter(Boolean)
      .filter(isValidEmail);
    return Array.from(new Set(cleaned.map(e => e.toLowerCase())));
  };

  const hasInvalids = (list) => (list || []).some(e => e && !isValidEmail(e));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tracking = normalizedList(trackingList);
    const maintenance = normalizedList(maintenanceList);
    
    if (hasInvalids(trackingList) || hasInvalids(maintenanceList)) {
      toast.error('Fix invalid email(s) before saving');
      return;
    }
    
    setSaving(true);
    try {
      await updatePlatformConfig({
        tracking_emails: tracking,
        maintenance_emails: maintenance
      });
      toast.success('Email lists updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update email lists');
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
          <div className="p-3 bg-green-100 rounded-lg">
            <FaList className="text-2xl text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Lists</h1>
            <p className="text-gray-600">Manage tracking and maintenance email lists</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[60vh] flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-lg">
          {/* Tracking Emails */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tracking Emails</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Ticket Notifications
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Used for ticket approval tracking notifications.</p>
            
            <div className="space-y-3">
              {trackingList.map((val, idx) => (
                <div key={`track-${idx}`} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        val && !isValidEmail(val) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="email@example.com"
                      value={val}
                      onChange={(e) => onChangeAt(setTrackingList, trackingList, idx, e.target.value)}
                      disabled={loading}
                    />
                    {val && !isValidEmail(val) && (
                      <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(setTrackingList, trackingList, idx)}
                    className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={loading}
                    title="Remove email"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAdd(setTrackingList, trackingList)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                disabled={loading}
              >
                <FaPlus className="text-sm" />
                Add Email
              </button>
            </div>
          </div>

          {/* Maintenance Emails */}
          <div className="border-t pt-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Maintenance Emails</h2>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Vehicle Maintenance
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Used for vehicle maintenance notifications.</p>
            
            <div className="space-y-3">
              {maintenanceList.map((val, idx) => (
                <div key={`maint-${idx}`} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        val && !isValidEmail(val) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="email@example.com"
                      value={val}
                      onChange={(e) => onChangeAt(setMaintenanceList, maintenanceList, idx, e.target.value)}
                      disabled={loading}
                    />
                    {val && !isValidEmail(val) && (
                      <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(setMaintenanceList, maintenanceList, idx)}
                    className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={loading}
                    title="Remove email"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAdd(setMaintenanceList, maintenanceList)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                disabled={loading}
              >
                <FaPlus className="text-sm" />
                Add Email
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <PrimaryBtn 
              type="submit" 
              disabled={saving || loading}
              >
                {saving ? 'Saving...' : 'Save Email Lists'}
            </PrimaryBtn>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmailListsConfig;
