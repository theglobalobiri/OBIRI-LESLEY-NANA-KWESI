import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Flame, TrendingUp } from 'lucide-react';
import { UserState, Task, ClassSession } from '../types';
import { generateMotivation } from '../services/geminiService';

interface DashboardProps {
  state: UserState;
  setView: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, setView }) => {
  const [quote, setQuote] = useState(state.motivationQuote);

  useEffect(() => {
    // Only fetch new quote if we haven't today (simulated by random chance for demo, normally check date)
    const fetchQuote = async () => {
      const q = await generateMotivation(state.name, state.tasks.filter(t => !t.completed).length);
      setQuote(q);
    };
    // Fetch on mount to show AI capability
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextClass = state.schedule.find(c => {
    // Simplified logic: Just get the first one for demo purposes
    // Real app would check current time vs start time
    return true; 
  });

  const pendingTasks = state.tasks.filter(t => !t.completed).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Hello, {state.name} 👋</h1>
          <p className="text-indigo-100 text-lg opacity-90 max-w-2xl italic">"{quote}"</p>
          <div className="mt-6 flex gap-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <Flame className="text-orange-300" size={20} />
              <span className="font-semibold">{state.streak} Day Streak</span>
            </div>
            {state.program && (
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium">
                {state.program}
              </div>
            )}
          </div>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Next Class Widget */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Clock className="text-indigo-600 dark:text-indigo-400" size={20} />
              Up Next
            </h2>
          </div>
          {nextClass ? (
            <div className={`p-4 rounded-xl border-l-4 ${nextClass.color} bg-opacity-50 dark:bg-opacity-20`}>
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{nextClass.name}</h3>
              <p className="text-sm opacity-80 mt-1 text-gray-700 dark:text-gray-300">{nextClass.startTime} - {nextClass.location}</p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No classes upcoming.</p>
          )}
          <button onClick={() => setView('SCHEDULE')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">View Full Timetable →</button>
        </div>

        {/* Tasks Widget */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            Quick Tasks
          </h2>
          <div className="space-y-3">
            {pendingTasks.length > 0 ? pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-500'}`} />
                <span className="text-gray-700 dark:text-gray-300 text-sm line-clamp-1">{task.title}</span>
              </div>
            )) : (
              <p className="text-gray-400 dark:text-gray-500 text-sm">All caught up! Great job.</p>
            )}
          </div>
          <button onClick={() => setView('TASKS')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Manage Tasks →</button>
        </div>

        {/* Finance Widget */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            Budget Snapshot
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Weekly Limit</span>
                <span className="font-bold text-gray-900 dark:text-white">${state.budget.weeklyLimit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Spent</span>
                <span className="font-bold text-red-600 dark:text-red-400">${state.budget.currentSpend}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((state.budget.currentSpend / state.budget.weeklyLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ${(state.budget.weeklyLimit - state.budget.currentSpend).toFixed(2)} remaining this week.
            </p>
          </div>
          <button onClick={() => setView('FINANCE')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Open Wallet →</button>
        </div>

      </div>
    </div>
  );
};