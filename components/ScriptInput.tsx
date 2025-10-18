
import React, { useState } from 'react';

interface ScriptInputProps {
  onGenerate: (script: string) => void;
  disabled: boolean;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ onGenerate, disabled }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerate(topic);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <label htmlFor="script-input" className="block text-lg font-medium text-gray-300 mb-2">
          Your Video Topic (in Tamil)
        </label>
        <textarea
          id="script-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="எ.கா: செயற்கை நுண்ணறிவின் எதிர்காலம்..."
          className="w-full h-24 p-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 text-white placeholder-gray-500 resize-none"
          disabled={disabled}
        />
        <p className="text-sm text-gray-500 mt-2">
          Enter a topic in Tamil. The AI will generate a script, voiceover, and visuals for a 1-minute video.
        </p>
        <button
          type="submit"
          disabled={disabled || !topic.trim()}
          className="mt-4 w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          Generate Video
        </button>
      </form>
    </div>
  );
};

export default ScriptInput;