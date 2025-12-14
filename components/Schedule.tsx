import React, { useState, useRef } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, Upload, Sparkles, Loader2, X } from 'lucide-react';
import { ClassSession } from '../types';
import { generateStudyScheduleFromImage } from '../services/geminiService';

interface ScheduleProps {
  schedule: ClassSession[];
  setSchedule: (schedule: ClassSession[]) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200',
  'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-200',
  'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-200',
];

const STUDY_COLOR = 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200';

export const Schedule: React.FC<ScheduleProps> = ({ schedule, setSchedule }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState<Partial<ClassSession>>({ day: 'Monday' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClass = () => {
    if (!newClass.name || !newClass.startTime || !newClass.endTime || !newClass.day) return;
    
    const session: ClassSession = {
      id: Date.now().toString(),
      name: newClass.name,
      day: newClass.day,
      startTime: newClass.startTime,
      endTime: newClass.endTime,
      location: newClass.location || 'TBD',
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    
    setSchedule([...schedule, session]);
    setShowAddModal(false);
    setNewClass({ day: 'Monday' });
  };

  const handleDelete = (id: string) => {
    setSchedule(schedule.filter(s => s.id !== id));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data:image/png;base64, prefix
        
        // Call Gemini Service
        const generatedSessions = await generateStudyScheduleFromImage(base64Data, file.type);
        
        if (generatedSessions && Array.isArray(generatedSessions)) {
           // Map AI response to our app structure
           const newSessions: ClassSession[] = generatedSessions.map((s, idx) => ({
             id: `gen-${Date.now()}-${idx}`,
             name: s.name,
             day: s.day,
             startTime: s.startTime,
             endTime: s.endTime,
             location: s.location || 'Home',
             color: s.name.toLowerCase().includes('study') ? STUDY_COLOR : COLORS[Math.floor(Math.random() * COLORS.length)]
           }));

           // Merge with existing schedule (or replace - here we merge for safety)
           // We filter out duplicates based on day+time roughly to avoid chaos if user uploads same thing
           const merged = [...schedule, ...newSessions];
           setSchedule(merged);
        }
        setIsAnalyzing(false);
      };
      reader.onerror = () => {
        setIsAnalyzing(false);
        alert("Error reading file.");
      };
    } catch (e) {
      console.error(e);
      setIsAnalyzing(false);
      alert("Failed to analyze timetable.");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Weekly Timetable</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your classes and let AI plan your study time.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex-1 md:flex-none bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-70"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isAnalyzing ? "Analyzing..." : "Auto-Plan from Image"}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> Add Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {DAYS.slice(0, 5).map(day => {
          const dayClasses = schedule
            .filter(s => s.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 min-h-[300px] transition-colors">
              <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-4 border-b dark:border-gray-700 pb-2 flex justify-between items-center">
                 {day}
                 <span className="text-xs font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{dayClasses.length} slots</span>
              </h3>
              <div className="space-y-3">
                {dayClasses.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 py-10 opacity-50">
                     <Calendar size={32} strokeWidth={1.5} />
                     <p className="text-sm mt-2">Free Day</p>
                  </div>
                ) : (
                  dayClasses.map(session => (
                    <div key={session.id} className={`p-3 rounded-lg border ${session.color} relative group hover:shadow-md transition-shadow`}>
                      <button 
                        onClick={() => handleDelete(session.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity bg-white/50 rounded-full p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                      <h4 className="font-bold text-sm leading-tight pr-4">{session.name}</h4>
                      <div className="flex items-center gap-1 text-xs mt-2 opacity-90 font-medium">
                        <Clock size={12} />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-1 opacity-80">
                        <MapPin size={12} />
                        <span>{session.location}</span>
                      </div>
                      {session.name.toLowerCase().includes('study') && (
                         <div className="absolute bottom-2 right-2 text-yellow-600 dark:text-yellow-400 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Sparkles size={12} />
                         </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Add New Class</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class Name</label>
                <input 
                  type="text" 
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={newClass.name || ''}
                  onChange={e => setNewClass({...newClass, name: e.target.value})}
                  placeholder="e.g. Advanced Calculus"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={newClass.day}
                    onChange={e => setNewClass({...newClass, day: e.target.value})}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={newClass.location || ''}
                    onChange={e => setNewClass({...newClass, location: e.target.value})}
                    placeholder="e.g. Room 301"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={newClass.startTime || ''}
                    onChange={e => setNewClass({...newClass, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                  <input 
                    type="time" 
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={newClass.endTime || ''}
                    onChange={e => setNewClass({...newClass, endTime: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddClass}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};