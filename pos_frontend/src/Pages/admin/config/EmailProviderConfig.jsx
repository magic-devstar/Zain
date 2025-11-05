import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPlatformConfig, updatePlatformConfig } from '../../../api/platformConfig';
import { toast } from 'react-hot-toast';
import Spinner from '../../../Components/Common/Spinner';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import SecondaryBtn from '../../../Components/Common/SecondaryBtn';
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa';

const isValidEmail = (email) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(email || '').trim());

const EmailProviderConfig = () => {
  const location = useLocation();
  const basePath = location.pathname.split('/platform-config')[0];
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Email configuration state
  const [emailConfig, setEmailConfig] = useState({
    email_host: '',
    email_port: 587,
    email_host_user: '',
    email_host_password: '',
    default_from_email: ''
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getPlatformConfig();
        setEmailConfig({
          email_host: data.email_host || '',
          email_port: data.email_port || 587,
          email_host_user: data.email_host_user || '',
          email_host_password: data.email_host_password || '',
          default_from_email: data.default_from_email || ''
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load email configuration');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEmailConfigChange = (field, value) => {
    setEmailConfig(prev => {
      const newConfig = {
        ...prev,
        [field]: value
      };
      
      // Only set default_from_email to email_host_user if it's empty
      if (field === 'email_host_user' && !prev.default_from_email) {
        newConfig.default_from_email = value;
      }
      
      return newConfig;
    });
  };

  const applyPreset = (presetName) => {
    const presets = {
      gmail: { host: 'smtp.gmail.com', port: 587 },
      outlook: { host: 'smtp-mail.outlook.com', port: 587 },
      ovh: { host: 'smtp.ovh.com', port: 587 },
      yahoo: { host: 'smtp.mail.yahoo.com', port: 587 },
      godaddy: { host: 'smtpout.secureserver.net', port: 587 },
    };
    
    const preset = presets[presetName];
    if (preset) {
      setEmailConfig(prev => ({
        ...prev,
        email_host: preset.host,
        email_port: preset.port
      }));
      toast.success(`Applied ${presetName} settings`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlatformConfig(emailConfig);
      toast.success('Email configuration updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update email configuration');
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
          <div className="p-3 bg-blue-100 rounded-lg">
            <FaEnvelope className="text-2xl text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Provider Settings</h1>
            <p className="text-gray-600">Configure SMTP settings and email providers</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[60vh] flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
          {/* Common Presets */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Quick Setup - Common Providers</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => applyPreset('gmail')} 
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                Gmail/Google Workspace
              </button>
              <button type="button" onClick={() => applyPreset('outlook')} 
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                Outlook
              </button>
              <button type="button" onClick={() => applyPreset('ovh')} 
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                OVH
              </button>
              <button type="button" onClick={() => applyPreset('yahoo')} 
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                Yahoo
              </button>
              <button type="button" onClick={() => applyPreset('godaddy')} 
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                GoDaddy
              </button>
            </div>
            <p className="text-sm text-gray-600">Click a provider to automatically set host and port. You'll still need to enter your credentials.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., smtp.gmail.com, smtp.ovh.com"
                value={emailConfig.email_host}
                onChange={(e) => handleEmailConfigChange('email_host', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">SMTP server hostname</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="587"
                value={emailConfig.email_port}
                onChange={(e) => handleEmailConfigChange('email_port', parseInt(e.target.value) || 587)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Usually 587 for TLS, 465 for SSL</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Login Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@ttincnc.com"
                value={emailConfig.email_host_user}
                onChange={(e) => handleEmailConfigChange('email_host_user', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Email address used for SMTP authentication</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="App password or regular password"
                value={emailConfig.email_host_password}
                onChange={(e) => handleEmailConfigChange('email_host_password', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Use app password for Gmail/Google Workspace</p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email Address (Sender)
                {emailConfig.email_host_user && emailConfig.default_from_email && 
                 emailConfig.email_host_user !== emailConfig.default_from_email && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Alias Mode
                    </span>
                )}
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="contact@ttincnc.com"
                value={emailConfig.default_from_email}
                onChange={(e) => handleEmailConfigChange('default_from_email', e.target.value)}
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                <p>Email address that appears as sender in outgoing emails.</p>
                {emailConfig.email_host_user && emailConfig.default_from_email && 
                 emailConfig.email_host_user !== emailConfig.default_from_email ? (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-blue-800">📧 Email Alias Configuration:</p>
                      <p>• Login with: <code className="bg-blue-100 px-1 rounded">{emailConfig.email_host_user}</code></p>
                      <p>• Send as: <code className="bg-blue-100 px-1 rounded">{emailConfig.default_from_email}</code></p>
                      <p className="text-blue-700 mt-1">
                        Make sure "{emailConfig.default_from_email}" is added as a verified alias in your email provider settings.
                      </p>
                    </div>
                ) : (
                    <p className="text-gray-600">Leave empty to use the login email as sender.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Google Workspace Alias Setup Instructions */}
          {emailConfig.email_host === 'smtp.gmail.com' && 
           emailConfig.email_host_user && emailConfig.default_from_email && 
           emailConfig.email_host_user !== emailConfig.default_from_email && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  🔧 Google Workspace Alias Setup Required
                </h3>
                <div className="text-sm text-yellow-700">
                  <p className="mb-2">To use <strong>{emailConfig.default_from_email}</strong> as sender, follow these steps:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to Gmail → ⚙ Settings → See all settings</li>
                    <li>Click "Accounts and Import" tab</li>
                    <li>In "Send mail as" section, click "Add another email address"</li>
                    <li>Add <strong>{emailConfig.default_from_email}</strong> and verify it</li>
                    <li>Make sure "Treat as an alias" is checked</li>
                  </ol>
                  <p className="mt-2 text-yellow-600">
                    Without this setup, emails may be rejected or marked as spam.
                  </p>
                </div>
              </div>
          )}

          <div className="flex gap-3 pt-4">
            <PrimaryBtn 
              type="submit" 
              disabled={saving || loading}
            >
                {saving ? 'Saving...' : 'Save Email Configuration'}
            </PrimaryBtn>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmailProviderConfig;
