import React, { useState, useEffect } from 'react';
import { Newspaper, Gamepad2, Users, Send, ExternalLink, Trophy, RefreshCw, HelpCircle, User, Loader2 } from 'lucide-react';
import { getTrendingStudentNews, generateQuiz, getWordGameData } from '../services/geminiService';
import ReactMarkdown from 'react-markdown'; // Assuming standard environment, but we'll use simple rendering if unavailable

export const SocialLounge: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'games' | 'chat'>('news');

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-full md:w-fit mx-auto">
        <button 
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'news' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Newspaper size={18} /> News & Blogs
        </button>
        <button 
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'games' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Gamepad2 size={18} /> Arcade
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Users size={18} /> Peer Chat
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'news' && <NewsFeed />}
        {activeTab === 'games' && <Arcade />}
        {activeTab === 'chat' && <PeerChat />}
      </div>
    </div>
  );
};

// --- Sub-components ---

const NewsFeed = () => {
  const [news, setNews] = useState<{text: string, sources: any[]} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    const data = await getTrendingStudentNews();
    setNews(data);
    setLoading(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400"><RefreshCw className="animate-spin mr-2" /> Finding trending stories...</div>;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Newspaper className="text-pink-500" /> Trending Now
        </h2>
        <button onClick={loadNews} className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      
      <div className="prose max-w-none text-gray-700 space-y-4">
        {/* Simple Markdown Rendering replacement since we can't import react-markdown easily without adding package */}
        <div className="whitespace-pre-wrap leading-relaxed">
            {news?.text}
        </div>
      </div>

      {news?.sources && news.sources.length > 0 && (
        <div className="mt-8 border-t pt-4">
          <h3 className="font-semibold text-gray-600 mb-3 text-sm uppercase">Sources & Further Reading</h3>
          <div className="grid gap-2">
            {news.sources.map((source: any, idx: number) => {
              if (source.web?.uri) {
                return (
                    <a 
                      key={idx} 
                      href={source.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={16} />
                      <span className="truncate font-medium">{source.web.title || source.web.uri}</span>
                    </a>
                )
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Arcade = () => {
  const [mode, setMode] = useState<'quiz' | 'word'>('quiz');

  return (
    <div className="h-full flex flex-col">
       <div className="bg-gray-50 border-b p-4 flex gap-4 justify-center">
         <button onClick={() => setMode('quiz')} className={`px-4 py-2 rounded-full text-sm font-bold ${mode === 'quiz' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}>
           Brain Quiz
         </button>
         <button onClick={() => setMode('word')} className={`px-4 py-2 rounded-full text-sm font-bold ${mode === 'word' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
           Word Scrabble
         </button>
       </div>
       <div className="flex-1 overflow-y-auto p-6">
         {mode === 'quiz' ? <QuizGame /> : <WordGame />}
       </div>
    </div>
  );
};

const QuizGame = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [topic, setTopic] = useState("General Knowledge");

  const startQuiz = async () => {
    setLoading(true);
    setFinished(false);
    setCurrentQ(0);
    setScore(0);
    const qs = await generateQuiz(topic);
    setQuestions(qs);
    setLoading(false);
  };

  const answer = (idx: number) => {
    if (idx === questions[currentQ].correctIndex) {
      setScore(s => s + 1);
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
    } else {
      setFinished(true);
    }
  };

  if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-purple-600" size={40} /><p className="mt-4 text-gray-500">Generating tricky questions...</p></div>;

  if (questions.length === 0) return (
    <div className="text-center py-20">
      <Trophy className="mx-auto text-purple-200 mb-4" size={64} />
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Quiz Arena</h3>
      <p className="text-gray-500 mb-6">Test your knowledge with AI-generated questions.</p>
      <input 
        value={topic} 
        onChange={e => setTopic(e.target.value)} 
        className="border p-2 rounded-lg mr-2" 
        placeholder="Enter topic..."
      />
      <button onClick={startQuiz} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700">Start Quiz</button>
    </div>
  );

  if (finished) return (
    <div className="text-center py-20 bg-purple-50 rounded-3xl">
      <h3 className="text-3xl font-bold text-purple-900 mb-2">Quiz Complete!</h3>
      <p className="text-xl text-purple-700 mb-8">You scored {score} out of {questions.length}</p>
      <button onClick={() => setQuestions([])} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">Play Again</button>
    </div>
  );

  const q = questions[currentQ];
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between text-sm text-gray-500 mb-4 uppercase tracking-wider font-bold">
        <span>Question {currentQ + 1}/{questions.length}</span>
        <span>Score: {score}</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-6">{q.question}</h3>
      <div className="space-y-3">
        {q.options.map((opt: string, i: number) => (
          <button 
            key={i} 
            onClick={() => answer(i)}
            className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all font-medium text-gray-700"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const WordGame = () => {
  const [letters, setLetters] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  
  const init = async () => {
    setFoundWords([]);
    setInput('');
    const data = await getWordGameData();
    setLetters(data.letters);
  };

  useEffect(() => { init(); }, []);

  const submitWord = () => {
    if (!input) return;
    // Simple validation: must use available letters
    const available = [...letters];
    const word = input.toUpperCase().split('');
    let valid = true;
    for (const char of word) {
      const idx = available.indexOf(char);
      if (idx === -1) { valid = false; break; }
      available.splice(idx, 1);
    }

    if (valid && !foundWords.includes(input.toUpperCase())) {
      setFoundWords([...foundWords, input.toUpperCase()]);
      setInput('');
    } else {
      alert("Invalid word or already found! Use only the letters shown.");
    }
  };

  return (
    <div className="text-center max-w-lg mx-auto">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Word Scrabble</h3>
      <p className="text-gray-500 mb-8">Form as many words as possible!</p>
      
      <div className="flex justify-center gap-2 mb-8">
        {letters.map((l, i) => (
          <div key={i} className="w-12 h-12 bg-orange-100 border-2 border-orange-300 rounded-lg flex items-center justify-center text-2xl font-bold text-orange-800 shadow-sm">
            {l}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-8">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 p-3 border rounded-xl text-center uppercase font-bold tracking-widest text-lg"
          placeholder="TYPE WORD"
        />
        <button onClick={submitWord} className="bg-orange-500 text-white px-6 rounded-xl font-bold">Submit</button>
      </div>

      <div className="text-left">
        <p className="text-sm font-bold text-gray-400 uppercase mb-2">Found Words ({foundWords.length})</p>
        <div className="flex flex-wrap gap-2">
          {foundWords.map(w => (
            <span key={w} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{w}</span>
          ))}
        </div>
      </div>
      
      <button onClick={init} className="mt-8 text-orange-600 text-sm hover:underline">New Letters</button>
    </div>
  );
};

const PeerChat = () => {
  const [msgs, setMsgs] = useState([
    { user: 'Sarah (Economics)', text: 'Has anyone seen the new finance blog Obiri posted? Super helpful!' },
    { user: 'Mike (CS)', text: 'Yeah, the bit about T-bills was clear.' },
  ]);
  const [txt, setTxt] = useState('');

  const send = () => {
    if (!txt.trim()) return;
    setMsgs([...msgs, { user: 'You', text: txt }]);
    setTxt('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
         {msgs.map((m, i) => (
           <div key={i} className={`flex flex-col ${m.user === 'You' ? 'items-end' : 'items-start'}`}>
             <div className="flex items-center gap-2 mb-1">
               <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                 {m.user[0]}
               </div>
               <span className="text-xs text-gray-500 font-medium">{m.user}</span>
             </div>
             <div className={`p-3 rounded-xl max-w-[80%] ${m.user === 'You' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
               {m.text}
             </div>
           </div>
         ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-2">
        <input 
          value={txt}
          onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Say hello to your peers..."
        />
        <button onClick={send} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};