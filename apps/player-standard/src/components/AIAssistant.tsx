'use client';

import { useState } from 'react';
import { getGenerativeModel } from 'firebase/ai';
import { ai } from '@coach-pocket/core';
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([
        { role: 'model', content: "Hi! I'm your AI Coach Assistant. I can help you design drills, plan sessions, or answer tennis questions. How can I help?" }
    ]);

    const generateResponse = async () => {
        if (!prompt.trim()) return;

        const userMessage = prompt;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setPrompt('');
        setIsLoading(true);

        try {
            // Use the initialized 'ai' instance from firebase.ts
            const model = getGenerativeModel(ai, { model: "gemini-2.0-flash" });

            const chat = model.startChat({
                history: messages.slice(1).map(m => ({
                    role: m.role === 'model' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                })),
            });

            const result = await chat.sendMessage(userMessage);
            const response = result.response.text();

            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMessage = error.message || JSON.stringify(error) || "Unknown error";
            setMessages(prev => [...prev, { role: 'model', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all text-white flex items-center justify-center"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Bot className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">AI Coach Assistant</h3>
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                        Online
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setMessages([messages[0]])}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                title="Reset Chat"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-purple-600 text-white rounded-br-none'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                            }`}
                                    >
                                        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                        <span className="text-xs text-slate-400">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-slate-800 border-t border-slate-700">
                            <div className="flex gap-2">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            generateResponse();
                                        }
                                    }}
                                    placeholder="Ask for drill ideas..."
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none h-10 min-h-[40px] max-h-24 scrollbar-hide"
                                />
                                <button
                                    onClick={generateResponse}
                                    disabled={!prompt.trim() || isLoading}
                                    className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
