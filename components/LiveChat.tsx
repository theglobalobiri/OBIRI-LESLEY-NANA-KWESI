import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, Volume2, User, Save, Loader2, Radio } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { AIBotConfig, UserState } from '../types';

interface LiveChatProps {
  botConfig: AIBotConfig;
  updateBotConfig: (config: AIBotConfig) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;

export const LiveChat: React.FC<LiveChatProps> = ({ botConfig, updateBotConfig }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localConfig, setLocalConfig] = useState<AIBotConfig>(botConfig);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentSessionRef = useRef<any>(null); // To store session object

  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  const stopAudio = () => {
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // Disconnect microphone processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Close contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const connectToGemini = async () => {
    setIsConnecting(true);
    try {
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnected(true);
            setIsConnecting(false);

            // Setup Input Processing
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            // Note: ScriptProcessor is deprecated but widely supported for raw PCM access
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: "audio/pcm;rate=16000",
                          data: base64Data
                      }
                  });
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                const audioData = base64ToArrayBuffer(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current);
                playAudioChunk(audioBuffer);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                if (audioContextRef.current) {
                    nextStartTimeRef.current = audioContextRef.current.currentTime;
                }
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            setIsConnected(false);
            stopAudio();
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setIsConnected(false);
            stopAudio();
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: botConfig.voice } }
            },
            systemInstruction: botConfig.systemInstruction
        }
      });
      
      // Store session for cleanup if needed, though we rely on callbacks
      currentSessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setIsConnecting(false);
      stopAudio();
    }
  };

  const disconnect = () => {
    // There isn't a direct "close" method exposed on the session object in this SDK version clearly,
    // but usually closing the stream or context triggers the end. 
    // Ideally we would call session.close() if available. 
    // For now, we force stop audio and reset state which effectively kills the client side.
    // The server will timeout.
    // A proper implementation might need to send a specific close signal if supported.
    stopAudio();
    setIsConnected(false);
  };

  // --- Audio Helpers ---

  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const decodeAudioData = async (arrayBuffer: ArrayBuffer, context: AudioContext) => {
     // Gemini returns raw PCM 24kHz mono (usually little endian)
     // We need to construct an AudioBuffer manually because decodeAudioData expects file headers (wav/mp3)
     // unless we wrap it in a wav container, but manual float conversion is faster for raw PCM.
     
     const dataView = new DataView(arrayBuffer);
     const numSamples = arrayBuffer.byteLength / 2;
     const audioBuffer = context.createBuffer(1, numSamples, 24000); 
     const channelData = audioBuffer.getChannelData(0);

     for (let i = 0; i < numSamples; i++) {
         const sample = dataView.getInt16(i * 2, true); // Little endian
         channelData[i] = sample / 32768.0;
     }
     
     return audioBuffer;
  };

  const playAudioChunk = (audioBuffer: AudioBuffer) => {
      if (!audioContextRef.current) return;
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      const currentTime = audioContextRef.current.currentTime;
      // Schedule next chunk
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      source.onended = () => {
          sourcesRef.current.delete(source);
      };
      sourcesRef.current.add(source);
  };


  useEffect(() => {
    return () => {
        stopAudio();
    };
  }, []);

  const handleSaveConfig = () => {
      updateBotConfig(localConfig);
      setIsConfiguring(false);
  };

  if (isConfiguring) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Customize Your AI Friend</h2>
            <button onClick={() => setIsConfiguring(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name</label>
              <input 
                type="text" 
                value={localConfig.name}
                onChange={e => setLocalConfig({...localConfig, name: e.target.value})}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice Personality</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {VOICES.map(voice => (
                  <button
                    key={voice}
                    onClick={() => setLocalConfig({...localConfig, voice})}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      localConfig.voice === voice 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Radio size={20} className={localConfig.voice === voice ? 'text-indigo-600' : 'text-gray-300'} />
                    <span className="font-medium">{voice}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions / Personality</label>
              <textarea 
                value={localConfig.systemInstruction}
                onChange={e => setLocalConfig({...localConfig, systemInstruction: e.target.value})}
                rows={4}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Describe how your AI friend should behave..."
              />
              <p className="text-xs text-gray-500 mt-2">Example: "You are a tough gym coach" or "You are a gentle philosopher".</p>
            </div>

            <button 
              onClick={handleSaveConfig}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
            >
              <Save size={20} /> Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center max-w-2xl mx-auto">
      <div className="w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Volume2 size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold">{botConfig.name}</h2>
                <p className="text-indigo-100 text-sm opacity-90">{isConnected ? 'Listening...' : 'Offline'}</p>
             </div>
          </div>
          <button 
            onClick={() => {
                setLocalConfig(botConfig);
                setIsConfiguring(true);
            }}
            disabled={isConnected}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center flex-col relative overflow-hidden">
           
           {/* Animated Circles */}
           {isConnected && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 bg-indigo-500 rounded-full opacity-20 animate-ping absolute"></div>
                <div className="w-48 h-48 bg-purple-500 rounded-full opacity-10 animate-pulse absolute delay-75"></div>
             </div>
           )}

           <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
             isConnected ? 'bg-indigo-600 shadow-2xl shadow-indigo-300 scale-110' : 'bg-gray-200'
           }`}>
              {isConnecting ? (
                  <Loader2 size={48} className="text-white animate-spin" />
              ) : (
                  <User size={64} className={isConnected ? 'text-white' : 'text-gray-400'} />
              )}
           </div>
           
           <p className="mt-8 text-gray-500 font-medium text-center px-6">
              {isConnecting 
                ? "Establishing connection..." 
                : isConnected 
                  ? "Go ahead, I'm listening!" 
                  : "Tap the microphone to start talking."}
           </p>
        </div>

        {/* Controls */}
        <div className="p-8 bg-white border-t border-gray-100 flex justify-center">
            {isConnected ? (
              <button 
                onClick={disconnect}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-105"
              >
                <MicOff size={32} className="text-white" />
              </button>
            ) : (
              <button 
                onClick={connectToGemini}
                disabled={isConnecting}
                className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg hover:scale-105 disabled:opacity-70 disabled:scale-100"
              >
                <Mic size={32} className="text-white" />
              </button>
            )}
        </div>

      </div>
      <p className="mt-4 text-xs text-gray-400">Powered by Gemini 2.5 Live API</p>
    </div>
  );
};