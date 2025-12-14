export enum ModuleView {
  DASHBOARD = 'DASHBOARD',
  SCHEDULE = 'SCHEDULE',
  TASKS = 'TASKS',
  FINANCE = 'FINANCE',
  LEARN = 'LEARN',
  SOCIAL = 'SOCIAL',
  LIVE_CHAT = 'LIVE_CHAT',
  PROFILE = 'PROFILE'
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

export interface ClassSession {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  color: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Books' | 'Entertainment' | 'Other';
  description: string;
  date: string;
}

export interface Budget {
  weeklyLimit: number;
  currentSpend: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AIBotConfig {
  name: string;
  voice: string;
  systemInstruction: string;
}

export interface UserState {
  name: string;
  program?: string;
  location?: string;
  avatar?: string;
  streak: number;
  motivationQuote: string;
  tasks: Task[];
  schedule: ClassSession[];
  expenses: Expense[];
  budget: Budget;
  botConfig: AIBotConfig;
}

export const INITIAL_STATE: UserState = {
  name: 'Student',
  program: 'General Studies',
  location: 'Campus',
  streak: 5,
  motivationQuote: 'The best way to predict the future is to create it.',
  tasks: [],
  schedule: [],
  expenses: [],
  budget: { weeklyLimit: 200, currentSpend: 0 },
  botConfig: {
    name: 'Obiri',
    voice: 'Puck',
    systemInstruction: 'You are a helpful, friendly student mentor.'
  }
};