import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Scene } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateScriptFromTopic = async (topic: string): Promise<string> => {
    const model = 'gemini-2.5-pro';
    const prompt = `You are an expert Tamil scriptwriter for viral YouTube Shorts.
    - Your task is to create a compelling, engaging, and concise script in Tamil based on the following topic.
    - The script must be suitable for a 1-minute video.
    - The tone should be informative and captivating for a general audience.
    - CRITICAL: Provide only the raw, spoken script content. Do NOT include any titles, headings, scene markers (like "காட்சி:"), sound effect descriptions (like "energetic music starts"), or any other non-dialogue text. The output must be pure, speakable narration.
    
    Topic: "${topic}"`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
};


export const analyzeScriptForScenes = async (script: string): Promise<Omit<Scene, 'imageUrl'>[]> => {
    const model = 'gemini-2.5-pro';
    const prompt = `You are a short video script analyzer. Your task is to break down the following text into a maximum of 10 distinct scenes for a 1-minute YouTube Short. For each scene, provide a short, descriptive sentence and a 2-3 word search query for a stock video that visually represents that scene. Also, provide a duration in seconds for how long the scene should appear. The sum of all 'duration' values must be exactly 60.

    Script: "${script}"

    Return the output as a valid JSON array. Each object in the array must have 'sceneDescription' (string), 'searchQuery' (string), and 'duration' (number). Do not include any other text or markdown formatting in your response.`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        sceneDescription: { type: Type.STRING, description: "A brief description of the scene." },
                        searchQuery: { type: Type.STRING, description: "A 2-3 word search term for stock footage." },
                        duration: { type: Type.NUMBER, description: "Duration of the scene in seconds." },
                    },
                    required: ["sceneDescription", "searchQuery", "duration"]
                }
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        let scenes: Omit<Scene, 'imageUrl'>[] = JSON.parse(jsonText);

        const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
        if (totalDuration > 0) {
            const scale = 60 / totalDuration;
            let runningTotal = 0;
            let scaledScenes = scenes.map((scene, index) => {
                let scaledDuration = scene.duration * scale;
                // For the last scene, adjust it to make the total exactly 60
                if (index === scenes.length - 1) {
                    scaledDuration = 60 - runningTotal;
                }
                runningTotal += scaledDuration;
                return {
                    ...scene,
                    duration: scaledDuration
                };
            });
            return scaledScenes;
        }
        
        return scenes;

    } catch (e) {
        console.error("Failed to parse scenes from Gemini response:", response.text, e);
        throw new Error("Could not understand the script structure. Please try rephrasing.");
    }
};


export const generateVoiceover = async (script: string): Promise<string> => {
    const model = "gemini-2.5-flash-preview-tts";
    
    // An explicit instruction improves model reliability.
    const ttsPrompt = `Read the following text aloud in Tamil: "${script}"`;

    const response = await ai.models.generateContent({
        model: model,
        // The TTS API expects the content in a specific structured format.
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    // This is one of the available prebuilt voices.
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        console.error("TTS API response was invalid. Full response:", JSON.stringify(response, null, 2));
        throw new Error("Failed to generate voiceover. The AI couldn't process the provided script. Please try modifying your script or try again later.");
    }
    return base64Audio;
};

export const generateImageForScene = async (description: string): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const prompt = `A vibrant, cinematic, high-resolution vertical video frame (1080x1920) for a YouTube Short. The scene is: ${description}`;

    const response = await ai.models.generateContent({
        model: model,
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
        console.error("Image generation response was invalid. Full response:", JSON.stringify(response, null, 2));
        throw new Error(`Failed to generate image for scene: "${description}". The prompt may have been blocked due to safety settings.`);
    }

    for (const part of parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    
    throw new Error(`Failed to generate image for scene: ${description}`);
};