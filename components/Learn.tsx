import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, TrendingUp, ShieldCheck, Coins, MessageCircle, Send, Loader2, PieChart, FileText, ExternalLink, Globe } from 'lucide-react';
import { chatWithObiri, explainFinancialConcept, getFinancialResources } from '../services/geminiService';
import { ChatMessage } from '../types';

interface LearnProps {
  userLanguage: string;
}

export const Learn: React.FC<LearnProps> = ({ userLanguage }) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'chat'>('concepts');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hi! I'm Obiri. Ask me anything about student finance, time management, or setting goals.", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const context = "User is looking at the Learn Hub.";
    // Pass userLanguage to the service
    const responseText = await chatWithObiri(userMsg.text, context, userLanguage);
    
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
    setChatHistory(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
      {/* Sidebar / Tabs */}
      <div className="lg:w-1/4 flex flex-col gap-2">
        <button 
          onClick={() => setActiveTab('concepts')}
          className={`p-4 rounded-xl text-left flex items-center gap-3 transition-all ${activeTab === 'concepts' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          <BookOpen size={20} />
          <span className="font-semibold">Core Concepts</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`p-4 rounded-xl text-left flex items-center gap-3 transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          <MessageCircle size={20} />
          <span className="font-semibold">Ask Obiri AI</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col transition-colors">
        {activeTab === 'concepts' ? (
          <div className="p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Financial Intelligence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <ConceptCard 
                icon={<Coins className="text-yellow-500" />}
                title="Compound Interest"
                subtitle="The 8th Wonder of the World"
                description="Compound interest is interest calculated on the initial principal, which also includes all of the accumulated interest. It's 'interest on interest'."
                detail="If you save $100/month at 7% interest, in 40 years you don't have $48,000 (just cash), you have over $260,000. Time is your best friend."
                userLanguage={userLanguage}
              />

              <ConceptCard 
                icon={<ShieldCheck className="text-green-500" />}
                title="Treasury Bills (T-Bills)"
                subtitle="Low Risk, Steady Growth"
                description="Short-term government debt obligations. You lend money to the government, and they pay you back with interest."
                detail="Considered one of the safest investments. Ideal for students who want to preserve capital while earning more than a standard bank savings account."
                userLanguage={userLanguage}
              />

              <ConceptCard 
                icon={<PieChart className="text-blue-500" />}
                title="Mutual Funds"
                subtitle="Diversification Made Easy"
                description="A pool of money collected from many investors to invest in securities like stocks, bonds, money market instruments, and other assets."
                detail="Don't put all your eggs in one basket. Mutual funds allow you to own a small slice of hundreds of companies at once, lowering your risk."
                userLanguage={userLanguage}
              />

              <ConceptCard 
                icon={<FileText className="text-orange-500" />}
                title="Bonds"
                subtitle="IOUs & Fixed Income"
                description="A fixed income instrument that represents a loan made by an investor to a borrower (typically corporate or governmental)."
                detail="Think of it as lending money to a company. They pay you interest periodically and return your original money (principal) at the end date."
                userLanguage={userLanguage}
              />

              <ConceptCard 
                icon={<TrendingUp className="text-purple-500" />}
                title="Cryptocurrency Basics"
                subtitle="High Risk, High Reward"
                description="Digital or virtual currencies that use cryptography for security. Decentralized networks based on blockchain technology."
                detail="Warning: Crypto is volatile. Educational Rule #1: Never invest money you cannot afford to lose. Understand 'Utility' vs 'Hype'."
                userLanguage={userLanguage}
              />
              
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
             {/* Chat Header */}
             <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                 <MessageCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
               </div>
               <div>
                 <h3 className="font-bold text-gray-800 dark:text-white">Obiri AI Mentor</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Ask about budgets, schedules, or study tips ({userLanguage})</p>
               </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
               {chatHistory.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-3 rounded-2xl ${
                     msg.role === 'user' 
                       ? 'bg-indigo-600 text-white rounded-br-none' 
                       : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm'
                   }`}>
                     <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                   </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex justify-start">
                   <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                     <Loader2 size={16} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                     <span className="text-xs text-gray-500 dark:text-gray-400">Obiri is thinking...</span>
                   </div>
                 </div>
               )}
               <div ref={chatEndRef} />
             </div>

             {/* Input */}
             <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
               <div className="flex gap-2">
                 <input
                   type="text"
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyPress}
                   placeholder="How do I save money on textbooks?"
                   className="flex-1 p-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:text-white"
                 />
                 <button 
                   onClick={handleSend}
                   disabled={isTyping || !input.trim()}
                   className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                 >
                   <Send size={20} />
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for educational cards
const ConceptCard: React.FC<{icon: React.ReactNode, title: string, subtitle: string, description: string, detail: string, userLanguage: string}> = ({ icon, title, subtitle, description, detail, userLanguage }) => {
  const [resources, setResources] = useState<{title: string, uri: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState(description);
  const [translatedDetail, setTranslatedDetail] = useState(detail);
  const [translating, setTranslating] = useState(false);

  // Effect to translate static content if language changes from English
  useEffect(() => {
    const translateContent = async () => {
      if (userLanguage === 'English') {
        setTranslatedDesc(description);
        setTranslatedDetail(detail);
        return;
      }
      setTranslating(true);
      // We use the chat service to "translate" or "explain in target language"
      const desc = await explainFinancialConcept(title, userLanguage);
      setTranslatedDesc(desc);
      setTranslating(false);
    };
    translateContent();
  }, [userLanguage, title, description, detail]);

  const toggleResources = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    // If we already have resources, don't fetch again
    if (resources.length > 0) return;

    setLoading(true);
    const data = await getFinancialResources(title);
    setResources(data);
    setLoading(false);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all bg-white dark:bg-gray-800 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">{icon}</div>
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{subtitle}</p>
        </div>
      </div>
      
      {translating ? (
        <div className="flex-1 py-4 flex items-center gap-2 text-gray-400">
           <Loader2 className="animate-spin" size={16} /> Translating to {userLanguage}...
        </div>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed flex-1">{translatedDesc}</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-200 italic border-l-4 border-indigo-200 dark:border-indigo-800 mb-4">
            "{userLanguage === 'English' ? detail : "Concept details available above."}"
          </div>
        </>
      )}
      
      <div className="mt-auto">
        <button 
          onClick={toggleResources}
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
             <>
               <Loader2 size={16} className="animate-spin" /> Fetching...
             </>
          ) : expanded ? (
             <>Hide Sources</>
          ) : (
             <>
               <Globe size={16} /> Explore Reliable Sources
             </>
          )}
        </button>
        
        {expanded && !loading && (
          <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
             {resources.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase mb-2">Curated by Gemini</p>
                  {resources.map((res, i) => (
                    <a 
                      key={i}
                      href={res.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600"
                    >
                      <ExternalLink size={14} className="flex-shrink-0" />
                      <span className="truncate">{res.title}</span>
                    </a>
                  ))}
                </>
             ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No specific resources found right now.</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};