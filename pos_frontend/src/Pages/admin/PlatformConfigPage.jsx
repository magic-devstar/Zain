import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaEnvelope, 
  FaCog, 
  FaList
} from 'react-icons/fa';

const PlatformConfigPage = () => {
  const location = useLocation();
  const basePath = location.pathname.split('/platform-config')[0];

  const configurationItems = [
    {
      id: 'email-provider',
      name: 'Email Provider',
      icon: FaEnvelope,
      path: '/email-provider',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Configure SMTP settings and email providers'
    },
    {
      id: 'email-lists',
      name: 'Email Lists',
      icon: FaList,
      path: '/email-lists',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Manage tracking and maintenance email lists'
    },
    {
      id: 'software-options',
      name: 'Software Options',
      icon: FaCog,
      path: '/software-options',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Configure preferred software options'
    }
  ];

  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Configuration</h1>
        <p className="text-gray-600">Configure and manage your platform settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {configurationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.id}
              to={`${basePath}/platform-config${item.path}`}
              className="group"
            >
              <div className={`
                ${item.color} 
                rounded-lg p-6 shadow-lg transition-all duration-300 
                transform hover:scale-105 hover:shadow-xl
                cursor-pointer
              `}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <IconComponent className="text-4xl text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {configurationItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No configuration options available.</p>
        </div>
      )}
    </div>
  );
}

export default PlatformConfigPage;


