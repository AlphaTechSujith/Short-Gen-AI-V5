import React, { useState, useCallback } from 'react';
import { generateScriptFromTopic, analyzeScriptForScenes, generateVoiceover, generateImageForScene } from './services/geminiService';
import { decode, decodeAudioData, audioBufferToWaveBlobUrl } from './utils/audioUtils';
import type { Scene } from './types';
import ScriptInput from './components/ScriptInput';
import VideoPreview from './components/VideoPreview';
import Loader from './components/Loader';

type AppState = 'idle' | 'loading' | 'preview' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const handleGenerateVideo = useCallback(async (topic: string) => {
    setAppState('loading');
    try {
      setLoadingMessage('Generating script from your topic...');
      const script = await generateScriptFromTopic(topic);

      setLoadingMessage('Analyzing your script...');
      const sceneData = await analyzeScriptForScenes(script);

      setLoadingMessage('Generating visuals for your scenes...');
      const imageGenerationPromises = sceneData.map(scene => 
          generateImageForScene(scene.sceneDescription)
      );
      const generatedImageUrls = await Promise.all(imageGenerationPromises);

      const finalScenes = sceneData.map((scene, index) => ({
          ...scene,
          imageUrl: generatedImageUrls[index],
      }));

      setScenes(finalScenes);

      setLoadingMessage('Generating Tamil voiceover...');
      // Clean the script to remove scene markers before generating audio
      const cleanedScriptForVoiceover = script
        .split('\n')
        .filter(line => !line.trim().startsWith('காட்சி:'))
        .join(' ');
      
      const audioData = await generateVoiceover(cleanedScriptForVoiceover);

      setLoadingMessage('Preparing your video...');
      // Using 'any' for webkitAudioContext for cross-browser compatibility.
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedBytes = decode(audioData);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
      const url = audioBufferToWaveBlobUrl(audioBuffer);
      setAudioUrl(url);

      setAppState('preview');
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setErrorMessage(error.message || 'An unknown error occurred.');
      setAppState('error');
    }
  }, []);

  const handleRestart = () => {
    setAppState('idle');
    setScenes([]);
    setAudioUrl('');
    setErrorMessage('');
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return <Loader message={loadingMessage} />;
      case 'preview':
        return <VideoPreview scenes={scenes} audioUrl={audioUrl} onRestart={handleRestart} />;
      case 'error':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl text-red-400 font-bold mb-4">Generation Failed</h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <button onClick={handleRestart} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700">
              Try Again
            </button>
          </div>
        );
      case 'idle':
      default:
        return <ScriptInput onGenerate={handleGenerateVideo} disabled={false} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold">
          AI Shorts<span className="text-indigo-400"> Generator</span>
        </h1>
        <p className="text-gray-400 mt-2">Turn your Tamil scripts into 1-minute videos instantly.</p>
      </header>
      <main className="w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;