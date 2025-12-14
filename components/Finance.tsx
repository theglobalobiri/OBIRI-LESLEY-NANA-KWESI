import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Expense, Budget } from '../types';

interface FinanceProps {
  expenses: Expense[];
  budget: Budget;
  setExpenses: (expenses: Expense[]) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Finance: React.FC<FinanceProps> = ({ expenses, budget, setExpenses }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Food');

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = budget.weeklyLimit - totalSpent;
  const progress = Math.min((totalSpent / budget.weeklyLimit) * 100, 100);

  const handleAddExpense = () => {
    if (!amount || !description) return;
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      description,
      date: new Date().toISOString()
    };
    setExpenses([...expenses, newExpense]);
    setAmount('');
    setDescription('');
  };

  // Process data for charts
  const categoryData = expenses.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overview Card */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Financial Vision & Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Weekly Budget</span>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">${budget.weeklyLimit.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
              <span className="text-red-600 dark:text-red-400 text-sm font-medium">Total Spent</span>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">${totalSpent.toFixed(2)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${remaining < 0 ? 'bg-red-100 border-red-200 dark:bg-red-900/30 dark:border-red-700' : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800'}`}>
              <span className={`${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} text-sm font-medium`}>Remaining</span>
              <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>${remaining.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Budget Usage</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
            <div 
              className={`h-2.5 rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {progress > 90 && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
              <AlertCircle size={16} />
              <span>Warning: You are approaching your weekly budget limit!</span>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-80 transition-colors">
           <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Spending by Category</h3>
           <ResponsiveContainer width="100%" height="100%">
             {categoryData.length > 0 ? (
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                    itemStyle={{ color: '#F3F4F6' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
             ) : (
               <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">No data yet</div>
             )}
           </ResponsiveContainer>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="text-green-600 dark:text-green-400" size={20} />
            Add Expense
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Lunch at cafe..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Books">Books/Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button 
              onClick={handleAddExpense}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Transaction
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent History</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {expenses.slice().reverse().map(expense => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{expense.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">-${expense.amount.toFixed(2)}</span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};