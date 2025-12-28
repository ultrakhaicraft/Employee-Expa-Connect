// src/components/FloatingChat/LocationPermissionGuide.tsx
import React from 'react';
import { motion } from 'framer-motion';

export const LocationPermissionGuide: React.FC = () => {
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    return 'Browser';
  };

  const browser = getBrowserName();

  const guides: Record<string, string[]> = {
    Chrome: [
      'Click the padlock 🔒 icon next to the URL bar',
      'Find the “Location” permission',
      'Change it to “Allow”',
      'Reload the page',
    ],
    Firefox: [
      'Click the padlock 🔒 or (i) icon beside the URL',
      'Select “More Information” → “Permissions”',
      'Find “Access Your Location” and choose “Allow”',
      'Reload the page',
    ],
    Edge: [
      'Click the padlock 🔒 icon next to the URL bar',
      'Locate “Location permission”',
      'Switch it to “Allow”',
      'Reload the page',
    ],
    Safari: [
      'Go to Safari → Settings → Websites → Location',
      'Locate this website in the list',
      'Set the permission to “Allow”',
      'Reload the page',
    ],
  };

  const currentGuide = guides[browser] || guides.Chrome;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-blue-200 shadow-lg p-4 max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl">📍</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            How to enable location access
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Browser: <span className="font-semibold text-blue-600">{browser}</span>
          </p>
          
          <ol className="space-y-2">
            {currentGuide.map((step, index) => (
              <li key={index} className="text-xs text-gray-700 flex gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold">
                  {index + 1}
                </span>
                <span className="flex-1 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <span className="font-medium">Or:</span> Use the 🗺️ button to pick a location on the map
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


