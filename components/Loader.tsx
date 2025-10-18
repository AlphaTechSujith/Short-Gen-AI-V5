
import React from 'react';

interface LoaderProps {
  message: string;
  progress?: number; // Optional progress from 0 to 100
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col justify-center items-center z-50">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
      <p className="mt-4 text-lg text-white">{message}</p>
      {progress !== undefined && (
        <div className="w-64 mt-4 bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-indigo-500 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default Loader;