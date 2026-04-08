'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, ArrowRight, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SessionTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SessionTypeModal({ isOpen, onClose }: SessionTypeModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">New Session</h2>
                                <p className="text-slate-400">What kind of session are you planning?</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Options */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Individual Option */}
                            <button
                                onClick={() => {
                                    router.push('/builder');
                                }}
                                className="group relative flex flex-col items-start p-6 rounded-xl bg-slate-700/30 border border-slate-700 hover:border-green-500/50 hover:bg-slate-700/50 transition-all text-left h-full"
                            >
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <User className="w-6 h-6 text-green-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Individual Session</h3>
                                <p className="text-sm text-slate-400 mb-6">Plan drills and exercises for 1-4 players focused on specific skills.</p>

                                <div className="mt-auto flex items-center text-sm font-medium text-green-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                    Start Building <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </button>

                            {/* Team Option */}
                            <button
                                onClick={() => {
                                    router.push('/team');
                                }}
                                className="group relative flex flex-col items-start p-6 rounded-xl bg-slate-700/30 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-700/50 transition-all text-left h-full"
                            >
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Team Session</h3>
                                <p className="text-sm text-slate-400 mb-6">Manage multi-court rotations and large group drills for academies.</p>

                                <div className="mt-auto flex items-center text-sm font-medium text-purple-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                    Open Team Board <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
