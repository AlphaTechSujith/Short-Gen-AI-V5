import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Scene } from '../types';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import DownloadIcon from './icons/DownloadIcon';
import Loader from './Loader';
import { renderVideo } from '../utils/videoRenderer';


interface VideoPreviewProps {
  scenes: Scene[];
  audioUrl: string;
  onRestart: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ scenes, audioUrl, onRestart }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const animationClasses = useMemo(() => ['animate-kenburns-top', 'animate-kenburns-right', 'animate-kenburns-bottom', 'animate-kenburns-left'], []);

  const cumulativeDurations = useMemo(() => scenes.reduce((acc, scene, index) => {
    const prevDuration = index > 0 ? acc[index - 1] : 0;
    acc.push(prevDuration + scene.duration);
    return acc;
  }, [] as number[]), [scenes]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const duration = audio.duration || 60;
      setProgress((currentTime / duration) * 100);

      const newSceneIndex = cumulativeDurations.findIndex(
        (cumulativeDuration) => currentTime < cumulativeDuration
      );

      const resolvedIndex = newSceneIndex !== -1 ? newSceneIndex : scenes.length - 1;
      if (resolvedIndex !== currentSceneIndex) {
          setCurrentSceneIndex(resolvedIndex);
      }
    };
    
    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(100);
        setCurrentSceneIndex(scenes.length - 1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [scenes, cumulativeDurations, currentSceneIndex]);


  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if(audio.ended) {
        audio.currentTime = 0;
        setProgress(0);
        setCurrentSceneIndex(0);
      }
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleDownload = async () => {
    setIsRendering(true);
    setRenderingProgress(0);
    try {
      const videoBlob = await renderVideo(scenes, audioUrl, (progress) => {
        setRenderingProgress(progress);
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(videoBlob);
      link.download = 'ai_short_video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Video rendering failed:", error);
        alert("Sorry, there was an error creating the video file.");
    } finally {
        setIsRendering(false);
    }
  };

  const currentScene = scenes[currentSceneIndex];
  const nextScene = scenes[currentSceneIndex + 1];

  return (
    <>
    {isRendering && <Loader message="Rendering your video... please wait." progress={renderingProgress} />}
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center">
      <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20">
        {scenes.map((scene, index) => (
             <img
                key={index}
                src={scene.imageUrl}
                alt={scene.sceneDescription}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${index === currentSceneIndex ? 'opacity-100' : 'opacity-0'} ${isPlaying && index === currentSceneIndex ? animationClasses[index % animationClasses.length] : 'animation-paused'}`}
                style={{ animationDuration: `${scene.duration + 0.5}s`}}
            />
        ))}

        <div className="absolute bottom-4 left-4 right-4 p-2 bg-black bg-opacity-50 rounded-lg text-center text-sm">
            <p>{currentScene?.sceneDescription}</p>
        </div>
        <audio ref={audioRef} src={audioUrl} />
      </div>

      <div className="w-full mt-4">
        <div className="h-2 bg-gray-700 rounded-full">
            <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="flex items-center space-x-6 mt-4">
        <button onClick={togglePlayPause} className="p-4 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition-colors" disabled={isRendering}>
            {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
        </button>
        <button onClick={handleDownload} className="p-3 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors" title="Download Video" disabled={isRendering}>
            <DownloadIcon className="w-6 h-6"/>
        </button>
      </div>

      <button onClick={onRestart} className="mt-6 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600" disabled={isRendering}>
        Start Over
      </button>
    </div>
    </>
  );
};

export default VideoPreview;