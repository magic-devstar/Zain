import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from './BackButton';

/**
 * AccessDenied component for displaying permission denied messages
 * @param {Object} props - Component props
 * @param {string} props.title - Page title (optional)
 * @param {string} props.message - Custom error message (optional)
 * @param {string} props.featureName - Name of the feature being accessed (optional)
 * @param {string[]} props.requiredPermissions - Array of required permissions (optional)
 * @param {string} props.backButtonText - Text for back button (optional)
 * @param {Function} props.onBack - Custom back handler (optional)
 * @param {string} props.className - Additional CSS classes (optional)
 */
const AccessDenied = ({
    title = "Access Denied",
    message = "You are not allowed to access this feature.",
    featureName = "this feature",
    requiredPermissions = [],
    backButtonText = "Go Back",
    onBack = null,
    className = ""
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className={`w-full h-full flex flex-col overflow-x-hidden ${className}`}>
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    {title}
                </h1>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl border border-red-200 shadow-lg max-w-md mx-auto">
                    <div className="mb-4">
                        <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-4">
                        {title}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {message} {featureName} requires special permissions.
                    </p>
                    
                    {requiredPermissions.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-800">
                                <strong>Required Permissions:</strong><br />
                                {requiredPermissions.map((permission, index) => (
                                    <span key={index}>
                                        • {permission}{index < requiredPermissions.length - 1 ? <br /> : ''}
                                    </span>
                                ))}
                            </p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleBack}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        {backButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
