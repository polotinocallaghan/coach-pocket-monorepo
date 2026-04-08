'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, X, Check, Rocket, Flame, Target } from 'lucide-react';
import { dataStore, Session, PlayerFeedback, UserProfile } from '@coach-pocket/core';
import { cn } from '@/lib/utils';

interface FeedbackOverlayProps {
    session: Session;
    coachId: string;
    onClose: () => void;
}

export default function FeedbackOverlay({ session, coachId, onClose }: FeedbackOverlayProps) {
    const [step, setStep] = useState(1);
    const [enjoyment, setEnjoyment] = useState(0);
    const [ratings, setRatings] = useState<{ [key: string]: number }>({});
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const features = ['rallies', 'points', 'technique', 'tactics', 'baskets', 'serves'];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const feedback: PlayerFeedback = {
            enjoyment,
            featureRatings: ratings,
            comment,
            submittedAt: new Date()
        };

        try {
            await dataStore.submitPlayerFeedback(coachId, session.id, feedback);
            setIsCompleted(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Failed to submit feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10"
                >
                    {!isCompleted ? (
                        <div className="p-6 sm:p-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">How was the session?</h2>
                                    <p className="text-sm text-slate-400 mt-1">{session.title}</p>
                                </div>
                                <button onClick={onClose} className="p-2 -mr-2 text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="flex gap-1 mb-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={cn(
                                        "h-1 flex-1 rounded-full transition-colors",
                                        step >= i ? "bg-emerald-500" : "bg-slate-800"
                                    )} />
                                ))}
                            </div>

                            {/* Steps */}
                            <div className="min-h-[280px]">
                                {step === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <p className="text-center text-slate-300 mb-8 font-medium italic">"The most important thing is that you enjoyed it!"</p>
                                        <div className="flex justify-between items-center px-4">
                                            {[1, 2, 3, 4, 5].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => { setEnjoyment(val); nextStep(); }}
                                                    className={cn(
                                                        "group flex flex-col items-center gap-2 transition-all",
                                                        enjoyment === val ? "scale-110" : "hover:scale-105"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-lg",
                                                        enjoyment === val 
                                                            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                                                            : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                                                    )}>
                                                        {val === 1 && "😫"}
                                                        {val === 2 && "😕"}
                                                        {val === 3 && "😐"}
                                                        {val === 4 && "😊"}
                                                        {val === 5 && "🤩"}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase tracking-widest",
                                                        enjoyment === val ? "text-emerald-400" : "text-slate-600"
                                                    )}>
                                                        {val === 1 && "Bad"}
                                                        {val === 5 && "Elite"}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Rate specific areas</h3>
                                        <div className="space-y-4">
                                            {features.map(feat => (
                                                <div key={feat} className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-400 capitalize">{feat}</span>
                                                    <div className="flex gap-1.5">
                                                        {[1, 2, 3, 4, 5].map(v => (
                                                            <button
                                                                key={v}
                                                                onClick={() => setRatings(prev => ({ ...prev, [feat]: v }))}
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                                                                    ratings[feat] === v
                                                                        ? "bg-emerald-500 border-emerald-400 text-white"
                                                                        : ratings[feat] > v 
                                                                            ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                                                                            : "bg-slate-800 border-slate-700 text-slate-600 hover:border-slate-600"
                                                                )}
                                                            >
                                                                <Star className={cn("w-3.5 h-3.5", ratings[feat] >= v && "fill-current")} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 flex gap-3">
                                            <button onClick={prevStep} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-semibold">Back</button>
                                            <button onClick={nextStep} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold">Comments</button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Any notes for the coach?</h3>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Write something brief..."
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 min-h-[120px] resize-none"
                                        />
                                        <div className="mt-8 flex gap-3">
                                            <button onClick={prevStep} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-semibold disabled:opacity-50" disabled={isSubmitting}>Back</button>
                                            <button 
                                                onClick={handleSubmit} 
                                                disabled={isSubmitting || enjoyment === 0}
                                                className="flex-[2] py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Sending..." : "Send Feedback"}
                                                <Rocket className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20"
                            >
                                <Check className="w-10 h-10 text-white stroke-[3px]" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-white mb-2">Awesome Job!</h2>
                            <p className="text-slate-400">Feedback sent to your coach. See you next time!</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
