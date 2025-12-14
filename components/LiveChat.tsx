import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, Volume2, User, Save, Loader2, Radio, Send, MessageSquare } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { AIBotConfig, UserState, ChatMessage } from '../types';
import { chatWithObiri } from '../services/geminiService';

interface LiveChatProps {
  botConfig: AIBotConfig;
  updateBotConfig: (config: AIBotConfig) => void;
  userLanguage: string;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;

export const LiveChat: React.FC<LiveChatProps> = ({ botConfig, updateBotConfig, userLanguage }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<AIBotConfig>(botConfig);
  
  // Text Chat State
  const [textInput, setTextInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessingText, setIsProcessingText] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentSessionRef = useRef<Promise<any> | null>(null);

  // Transcription Refs
  const inputTranscriptRef = useRef('');
  const outputTranscriptRef = useRef('');

  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const stopAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

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
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clear transcription buffers
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
  };

  const connectToGemini = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnected(true);
            setIsConnecting(false);

            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
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
            const serverContent = message.serverContent;

            // Handle Audio Output
            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                const audioData = base64ToArrayBuffer(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current);
                playAudioChunk(audioBuffer);
            }

            // Handle Transcriptions
            if (serverContent?.outputTranscription) {
                outputTranscriptRef.current += serverContent.outputTranscription.text;
            }
            if (serverContent?.inputTranscription) {
                inputTranscriptRef.current += serverContent.inputTranscription.text;
            }

            // Handle Turn Complete - Commit transcriptions to chat
            if (serverContent?.turnComplete) {
                const userText = inputTranscriptRef.current;
                const modelText = outputTranscriptRef.current;

                if (userText || modelText) {
                    setChatMessages(prev => {
                        const newMsgs = [...prev];
                        if (userText.trim()) {
                             newMsgs.push({
                                id: Date.now().toString() + '-u',
                                role: 'user',
                                text: userText.trim(),
                                timestamp: Date.now()
                            });
                        }
                        if (modelText.trim()) {
                            newMsgs.push({
                                id: Date.now().toString() + '-m',
                                role: 'model',
                                text: modelText.trim(),
                                timestamp: Date.now()
                            });
                        }
                        return newMsgs;
                    });
                    
                    inputTranscriptRef.current = '';
                    outputTranscriptRef.current = '';
                }
            }

            // Handle Interruption
            if (serverContent?.interrupted) {
                sourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                if (audioContextRef.current) {
                    nextStartTimeRef.current = audioContextRef.current.currentTime;
                }
                outputTranscriptRef.current = ''; // Clear interrupted response text
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
            setErrorMsg("Connection error. The service might be temporarily unavailable.");
            stopAudio();
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: botConfig.voice } }
            },
            systemInstruction: botConfig.systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        }
      });
      
      // CRITICAL FIX: Handle the promise rejection to catch 503 Service Unavailable errors
      sessionPromise.catch(error => {
          console.error("Gemini Live Connection Failed:", error);
          setIsConnecting(false);
          setIsConnected(false);
          setErrorMsg("Service is currently unavailable. Please try again later.");
          stopAudio();
      });

      currentSessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setIsConnecting(false);
      setErrorMsg("Failed to access microphone or connect.");
      stopAudio();
    }
  };

  const disconnect = () => {
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
     const dataView = new DataView(arrayBuffer);
     const numSamples = arrayBuffer.byteLength / 2;
     const audioBuffer = context.createBuffer(1, numSamples, 24000); 
     const channelData = audioBuffer.getChannelData(0);

     for (let i = 0; i < numSamples; i++) {
         const sample = dataView.getInt16(i * 2, true);
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
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      source.onended = () => {
          sourcesRef.current.delete(source);
      };
      sourcesRef.current.add(source);
  };

  const sendText = async () => {
    if (!textInput.trim()) return;
    
    const text = textInput;
    setTextInput('');
    setIsProcessingText(true);
    
    // Add user message to local state immediately
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);

    try {
        // Use standard chat service as fallback for text interaction
        // Note: This is separate from the Live Audio context
        const responseText = await chatWithObiri(text, "User is in the Live Chat component.", userLanguage);
        const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
        setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        console.error("Text chat failed", e);
    } finally {
        setIsProcessingText(false);
    }
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Customize Your AI Friend</h2>
            <button onClick={() => setIsConfiguring(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bot Name</label>
              <input 
                type="text" 
                value={localConfig.name}
                onChange={e => setLocalConfig({...localConfig, name: e.target.value})}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Voice Personality</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {VOICES.map(voice => (
                  <button
                    key={voice}
                    onClick={() => setLocalConfig({...localConfig, voice})}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      localConfig.voice === voice 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Radio size={20} className={localConfig.voice === voice ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'} />
                    <span className="font-medium">{voice}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instructions / Personality</label>
              <textarea 
                value={localConfig.systemInstruction}
                onChange={e => setLocalConfig({...localConfig, systemInstruction: e.target.value})}
                rows={4}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Describe how your AI friend should behave..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Example: "You are a tough gym coach" or "You are a gentle philosopher".</p>
            </div>

            <button 
              onClick={handleSaveConfig}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
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
      <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[600px] transition-colors relative">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center z-10 relative shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Volume2 size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold">{botConfig.name}</h2>
                <p className="text-indigo-100 text-sm opacity-90">
                   {isConnecting ? 'Connecting...' : isConnected ? 'Listening & Transcribing...' : 'Offline'}
                </p>
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

        {/* Content Area - Visualizer OR Chat Messages */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 relative overflow-hidden transition-colors flex flex-col">
           
           {/* Visualizer Background */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              {isConnected && (
                 <>
                    <div className="w-64 h-64 bg-indigo-500 rounded-full animate-ping absolute"></div>
                    <div className="w-96 h-96 bg-purple-500 rounded-full animate-pulse absolute delay-75"></div>
                 </>
              )}
           </div>

           {/* Chat Messages Overlay if any exist */}
           {chatMessages.length > 0 ? (
             <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
               {chatMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                 </div>
               ))}
               {isProcessingText && (
                  <div className="flex justify-start">
                     <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm border dark:border-gray-700">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                     </div>
                  </div>
               )}
               <div ref={chatEndRef} />
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center z-10 p-6">
                <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isConnected ? 'bg-indigo-600 shadow-2xl shadow-indigo-300 dark:shadow-indigo-900 scale-110' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                    {isConnecting ? (
                        <Loader2 size={48} className="text-white animate-spin" />
                    ) : (
                        <User size={64} className={isConnected ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                    )}
                </div>
                {errorMsg ? (
                  <p className="mt-8 text-red-500 font-medium text-center bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{errorMsg}</p>
                ) : (
                  <p className="mt-8 text-gray-500 dark:text-gray-400 font-medium text-center px-6">
                      {isConnecting ? "Establishing connection..." : isConnected ? "Go ahead, I'm listening!" : "Tap the mic to talk, or type below."}
                  </p>
                )}
             </div>
           )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4 transition-colors z-20">
            {/* Mic Button - Centered if no chat, compact if chat exists */}
            <div className={`flex justify-center transition-all ${chatMessages.length > 0 ? 'hidden' : 'block'}`}>
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

            {/* Input Area */}
            <div className="w-full flex gap-2 items-center">
                {chatMessages.length > 0 && (
                   <button 
                     onClick={isConnected ? disconnect : connectToGemini}
                     className={`p-3 rounded-xl transition-colors ${isConnected ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                   >
                     {isConnected ? <MicOff size={20} /> : <Mic size={20} />}
                   </button>
                )}
                <input 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendText()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white dark:bg-gray-700 transition-colors"
                />
                <button 
                  onClick={sendText}
                  disabled={!textInput.trim() || isProcessingText}
                  className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
            </div>
        </div>

      </div>
      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Powered by Gemini 2.5 Live API (Audio) & Flash (Text)</p>
    </div>
  );
};