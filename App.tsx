import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Wallet, 
  GraduationCap, 
  Menu, 
  X,
  UserCircle,
  LogOut,
  Mic,
  Coffee,
  Moon,
  Sun,
  Settings
} from 'lucide-react';
import { INITIAL_STATE, UserState, ModuleView, AIBotConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { Schedule } from './components/Schedule';
import { Finance } from './components/Finance';
import { Learn } from './components/Learn';
import { LiveChat } from './components/LiveChat';
import { SocialLounge } from './components/SocialLounge';
import { Profile } from './components/Profile';

// Simple Task Component for 'Build' module
const TaskManager: React.FC<{ tasks: any[], setTasks: any }> = ({ tasks, setTasks }) => {
  const [input, setInput] = useState('');
  
  const addTask = () => {
    if (!input.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), title: input, completed: false, priority: 'medium', dueDate: new Date().toISOString() }]);
    setInput('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteCompleted = () => {
    setTasks(tasks.filter((t: any) => !t.completed));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Intent & Action (Tasks)</h2>
        <div className="flex gap-2 mb-6">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="What is your intent for today?"
          />
          <button onClick={addTask} className="bg-indigo-600 text-white px-6 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Add</button>
        </div>

        <div className="space-y-3">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input 
                type="checkbox" 
                checked={task.completed} 
                onChange={() => toggleTask(task.id)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
              <span className={`flex-1 ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</span>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 py-8">Your list is empty. Set an intent!</p>}
        </div>
        
        {tasks.some((t: any) => t.completed) && (
          <button onClick={deleteCompleted} className="mt-4 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400">Clear completed</button>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [userState, setUserState] = useState<UserState>(() => {
    const saved = localStorage.getItem('obiri_state');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [currentView, setCurrentView] = useState<ModuleView>(ModuleView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('obiri_state', JSON.stringify(userState));
  }, [userState]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const updateExpenses = (newExpenses: any[]) => {
    const total = newExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    setUserState(prev => ({
      ...prev,
      expenses: newExpenses,
      budget: { ...prev.budget, currentSpend: total }
    }));
  };

  const updateBotConfig = (config: AIBotConfig) => {
    setUserState(prev => ({ ...prev, botConfig: config }));
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ModuleView, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium text-left">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#f3f4f6] dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 fixed h-full z-10 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">OBIRI</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem view={ModuleView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={ModuleView.SCHEDULE} icon={CalendarDays} label="Schedule" />
          <NavItem view={ModuleView.TASKS} icon={CheckSquare} label="Tasks & Notes" />
          <NavItem view={ModuleView.FINANCE} icon={Wallet} label="Finance" />
          <NavItem view={ModuleView.LEARN} icon={GraduationCap} label="Learn Hub" />
          <NavItem view={ModuleView.SOCIAL} icon={Coffee} label="Student Lounge" />
          <NavItem view={ModuleView.LIVE_CHAT} icon={Mic} label="Talk to Obiri" />
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <button 
             onClick={() => setDarkMode(!darkMode)}
             className="flex items-center gap-3 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
             {darkMode ? <Sun size={18} /> : <Moon size={18} />}
             <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          
          <button 
             onClick={() => setCurrentView(ModuleView.PROFILE)}
             className="flex items-center gap-3 px-2 py-2 w-full hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
          >
             {userState.avatar ? (
                <img src={userState.avatar} alt="User" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
             ) : (
                <UserCircle className="text-gray-400 group-hover:text-indigo-600" size={32} />
             )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{userState.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{userState.program || 'Student Plan'}</p>
            </div>
            <Settings size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500" />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-20 px-4 py-3 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
          <span className="font-bold text-lg text-gray-800 dark:text-white">OBIRI</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-600 dark:text-gray-300">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
             {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
           </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-10 pt-20 px-4 pb-4 md:hidden flex flex-col gap-2 overflow-y-auto">
          <NavItem view={ModuleView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={ModuleView.SCHEDULE} icon={CalendarDays} label="Schedule" />
          <NavItem view={ModuleView.TASKS} icon={CheckSquare} label="Tasks & Notes" />
          <NavItem view={ModuleView.FINANCE} icon={Wallet} label="Finance" />
          <NavItem view={ModuleView.LEARN} icon={GraduationCap} label="Learn Hub" />
          <NavItem view={ModuleView.SOCIAL} icon={Coffee} label="Student Lounge" />
          <NavItem view={ModuleView.LIVE_CHAT} icon={Mic} label="Talk to Obiri" />
          <div className="border-t border-gray-100 dark:border-gray-800 my-2 pt-2">
             <NavItem view={ModuleView.PROFILE} icon={UserCircle} label="My Profile" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {currentView === ModuleView.DASHBOARD && <Dashboard state={userState} setView={setCurrentView} />}
          {currentView === ModuleView.SCHEDULE && (
            <Schedule 
              schedule={userState.schedule} 
              setSchedule={(s) => setUserState(prev => ({...prev, schedule: s}))} 
            />
          )}
          {currentView === ModuleView.FINANCE && (
            <Finance 
              expenses={userState.expenses} 
              budget={userState.budget} 
              setExpenses={updateExpenses} 
            />
          )}
          {currentView === ModuleView.LEARN && <Learn userLanguage={userState.language} />}
          {currentView === ModuleView.TASKS && (
            <TaskManager 
              tasks={userState.tasks} 
              setTasks={(t: any) => setUserState(prev => ({...prev, tasks: t}))} 
            />
          )}
          {currentView === ModuleView.SOCIAL && <SocialLounge />}
          {currentView === ModuleView.LIVE_CHAT && (
            <LiveChat 
              botConfig={userState.botConfig}
              updateBotConfig={updateBotConfig}
              userLanguage={userState.language}
            />
          )}
          {currentView === ModuleView.PROFILE && (
            <Profile 
              state={userState}
              updateState={(updates) => setUserState(prev => ({ ...prev, ...updates }))}
            />
          )}
        </div>
      </main>
    </div>
  );
}