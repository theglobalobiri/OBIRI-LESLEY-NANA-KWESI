import React, { useRef } from 'react';
import { UserCircle, Camera, Save, MapPin, BookOpen, Type, Globe } from 'lucide-react';
import { UserState } from '../types';

interface ProfileProps {
  state: UserState;
  updateState: (updates: Partial<UserState>) => void;
}

const LANGUAGES = [
  'English', 
  'Spanish', 
  'French', 
  'German', 
  'Chinese (Mandarin)', 
  'Hindi', 
  'Arabic', 
  'Portuguese',
  'Swahili'
];

export const Profile: React.FC<ProfileProps> = ({ state, updateState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateState({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Student Profile</h2>
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-inner bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {state.avatar ? (
                <img src={state.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={80} className="text-gray-400" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload} 
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to update photo</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Type size={16} /> Full Name
            </label>
            <input 
              type="text" 
              value={state.name}
              onChange={e => updateState({ name: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-colors"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <BookOpen size={16} /> Program / Major
            </label>
            <input 
              type="text" 
              value={state.program || ''}
              onChange={e => updateState({ program: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-colors"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin size={16} /> Campus / Location
            </label>
            <input 
              type="text" 
              value={state.location || ''}
              onChange={e => updateState({ location: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-colors"
              placeholder="e.g. London"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Globe size={16} /> Preferred Language
            </label>
            <select 
              value={state.language || 'English'}
              onChange={e => updateState({ language: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-colors"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
           <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
             <Save size={18} /> Save Changes
           </button>
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-400 dark:text-gray-500">
        Changes are auto-saved to your local browser storage.
      </div>
    </div>
  );
};