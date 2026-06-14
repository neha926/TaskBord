import React, { useState, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, CheckCircle2 } from 'lucide-react';
import api from '../configs/api';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';

const AIPortfolioOnboarding = ({ onClose, onComplete }) => {
    const { getToken } = useAuth();
    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hi! I'm your AI career assistant. Let's build your professional portfolio together." }
    ]);
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1); // -1: initial, 0: first question...

    useEffect(() => {
        fetchInitialQuestions();
    }, []);

    const fetchInitialQuestions = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get('/api/users/onboarding/questions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuestions(data.questions);
            if (data.questions.length > 0) {
                setCurrentStep(0);
                setMessages(prev => [...prev, { role: 'ai', content: data.questions[0] }]);
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || loading) return;

        const currentInput = userInput;
        const newUserMessage = { role: 'user', content: currentInput };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput("");
        setLoading(true);

        try {
            const token = await getToken();
            const { data } = await api.post('/api/users/onboarding/parse', { userInput: currentInput }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Even if AI extraction didn't find new data, we continue the chat
            const nextStep = currentStep + 1;
            
            if (questions[nextStep]) {
                setCurrentStep(nextStep);
                setTimeout(() => {
                    setMessages(prev => [...prev, { role: 'ai', content: questions[nextStep] }]);
                }, 800);
            } else {
                setCurrentStep(questions.length); // End
                setTimeout(() => {
                    setMessages(prev => [...prev, { role: 'ai', content: "Perfect! I've updated your profile with all the details. You can click 'I'm Done' to view your professional portfolio!" }]);
                }, 800);
            }
        } catch (error) {
            console.error("AI Onboarding Error:", error);
            // If the network call itself fails, we handle it
            setMessages(prev => [...prev, { role: 'ai', content: "I had a connection issue. Could you please try again?" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh] border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">AI Profile Editor</h2>
                            <p className="text-xs text-blue-100">Update your details with AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-zinc-900/50">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                msg.role === 'ai' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-blue-600'
                            }`}>
                                {msg.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                msg.role === 'ai' 
                                ? 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-tl-none border border-gray-100 dark:border-zinc-800' 
                                : 'bg-blue-600 text-white rounded-tr-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4">
                            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
                                <Bot size={20} />
                            </div>
                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-800 flex gap-1">
                                <span className="size-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                <span className="size-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="size-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input 
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !userInput.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 italic">Example: "I did B.Tech from IIT Delhi in 2022 and worked as SDE at Google for 1 year."</p>
                        <button 
                            onClick={onComplete}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            <CheckCircle2 size={14} /> I'm Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIPortfolioOnboarding;
