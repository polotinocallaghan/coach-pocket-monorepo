'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Play,
    Upload,
    FileVideo,
    MessageSquare,
    Clock,
    Trophy,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionExercise, Exercise } from '@coach-pocket/core';
import TacticalBoard from '../../shared/TacticalBoard';
import { storage } from '@coach-pocket/core';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CourtIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="2 2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="7" y1="7" x2="17" y2="7" />
        <line x1="7" y1="17" x2="17" y2="17" />
        <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
);

export interface SessionExecutionViewProps {
    sessionId?: string;
    sessionTitle: string;
    exercises: (SessionExercise & { exercise?: Exercise })[];
    onClose: () => void;
    onComplete?: (results?: {
        notes: { [key: number]: string };
        ratings: { [key: number]: number };
        videoUrls: { [key: number]: string };
    }) => void;
}

export default function SessionExecutionView({ sessionId, sessionTitle, exercises, onClose, onComplete }: SessionExecutionViewProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedIndices, setCompletedIndices] = useState<number[]>([]);
    const [showFinished, setShowFinished] = useState(false);
    const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // State for user inputs (notes/uploads/ratings) per exercise
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [uploads, setUploads] = useState<Record<number, File | null>>({});
    const [ratings, setRatings] = useState<Record<number, number>>({});

    const currentExercise = exercises[currentIndex];
    const progress = ((currentIndex + 1) / exercises.length) * 100;
    const isCompleted = completedIndices.includes(currentIndex);
    const allCompleted = exercises.length > 0 && completedIndices.length === exercises.length;

    const handleExerciseClick = (index: number) => {
        setCurrentIndex(index);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setViewMode('list');
    };

    const handleNext = () => {
        if (currentIndex < exercises.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const toggleComplete = () => {
        setCompletedIndices(prev =>
            prev.includes(currentIndex)
                ? prev.filter(i => i !== currentIndex)
                : [...prev, currentIndex]
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const MAX_SIZE_MB = 25;
            
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                alert(`Error: El vídeo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Por límite de tamaño, el máximo es ${MAX_SIZE_MB}MB.`);
                e.target.value = ''; // Clean up input
                return;
            }

            setUploads(prev => ({
                ...prev,
                [currentIndex]: file
            }));
        }
    };

    const handleFinalize = async () => {
        setIsUploading(true);
        const uploadedUrls: { [key: number]: string } = {};

        try {
            for (const [indexStr, file] of Object.entries(uploads)) {
                if (!file) continue;
                const index = parseInt(indexStr);
                
                if (sessionId) {
                    const fileRef = ref(storage, `sessions/${sessionId}/ex_${index}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
                    const snapshot = await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(snapshot.ref);
                    uploadedUrls[index] = url;
                }
            }
            
            onComplete?.({
                notes,
                ratings,
                videoUrls: uploadedUrls
            });
            setShowFinished(true);
        } catch (error) {
            console.error("Error uploading videos:", error);
            alert("Error uploading videos. Please check your connection or retry.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSafeClose = useCallback(() => {
        const hasNotes = Object.values(notes).some(n => (n || '').trim().length > 0);
        const hasUploads = Object.values(uploads).some(u => u !== null && u !== undefined);

        if (hasNotes || hasUploads) {
            if (!window.confirm("¿Seguro que quieres salir? Abandonarás la sesión y los datos introducidos.")) {
                return;
            }
        }
        onClose();
    }, [notes, uploads, onClose]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode === 'detail') {
                if (e.key === 'ArrowRight') handleNext();
                if (e.key === 'ArrowLeft') handlePrev();
            }
            if (e.key === 'Escape') {
                if (viewMode === 'detail') handleBackToList();
                else handleSafeClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, handleSafeClose, viewMode]);

    // ─── Completion Celebration Screen ───
    if (showFinished) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <motion.div
                    className="flex flex-col items-center gap-8 text-center px-6"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                    <motion.div
                        className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                    >
                        <Trophy className="w-14 h-14 text-slate-900" />
                    </motion.div>

                    <div>
                        <motion.h1
                            className="text-4xl md:text-5xl font-black text-white mb-3"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            Workout Complete!
                        </motion.h1>
                        <motion.p
                            className="text-lg text-slate-400"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {sessionTitle}
                        </motion.p>
                    </div>

                    <motion.div
                        className="flex gap-6 mt-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-center">
                            <div className="text-2xl font-bold text-white">{exercises.length}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold mt-1">Exercises</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {exercises.reduce((sum, ex) => sum + (ex.duration || 10), 0)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold mt-1">Minutes</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {Object.keys(ratings).length}/{exercises.length}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold mt-1">Rated</div>
                        </div>
                    </motion.div>

                    <motion.button
                        onClick={() => router.push('/calendar')}
                        className="mt-6 px-10 py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-full text-lg transition-all shadow-lg shadow-green-500/20 active:scale-95"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        Done
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-in fade-in duration-300">
                <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={handleSafeClose} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-white">{sessionTitle}</h1>
                    </div>

                    <button
                        onClick={() => setIsTacticalBoardOpen(true)}
                        className="p-2 bg-slate-800 hover:bg-green-500 hover:text-slate-900 text-green-500 rounded-xl transition flex items-center gap-2 group"
                    >
                        <CourtIcon className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Tactical Board</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full">
                    {exercises.map((item, index) => {
                        const isItemCompleted = completedIndices.includes(index);
                        const itemRating = ratings[index];

                        return (
                            <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 hover:border-slate-700 transition">
                                <div className="flex items-start justify-between gap-4">
                                    <div
                                        onClick={() => handleExerciseClick(index)}
                                        className="flex-1 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-slate-500 text-sm font-mono">#{index + 1}</span>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded capitalize tracking-wider",
                                                item.block === 'warm-up' && "bg-orange-500/10 text-orange-400",
                                                item.block === 'technical' && "bg-blue-500/10 text-blue-400",
                                                item.block === 'situational' && "bg-purple-500/10 text-purple-400",
                                                item.block === 'competitive' && "bg-red-500/10 text-red-400",
                                                item.block === 'cool-down' && "bg-teal-500/10 text-teal-400"
                                            )}>
                                                {item.block.replace('-', ' ')}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition">{item.exercise?.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.duration || 10} min
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (isItemCompleted) {
                                                setCompletedIndices(prev => prev.filter(i => i !== index));
                                            } else {
                                                setCompletedIndices(prev => [...prev, index]);
                                            }
                                        }}
                                        className={cn(
                                            "p-3 rounded-full transition-all border shrink-0",
                                            isItemCompleted
                                                ? "bg-green-500 text-slate-900 border-green-500"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                                        )}
                                    >
                                        <CheckCircle className={cn("w-6 h-6", isItemCompleted && "fill-current")} />
                                    </button>
                                </div>

                                {/* Inline Rating */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rate:</span>
                                    <div className="flex gap-1">
                                        {[
                                            { value: 1, emoji: '😫' },
                                            { value: 2, emoji: '😐' },
                                            { value: 3, emoji: '🙂' },
                                            { value: 4, emoji: '🤩' }
                                        ].map((rating) => (
                                            <button
                                                key={rating.value}
                                                onClick={() => setRatings(prev => ({ ...prev, [index]: rating.value }))}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                                                    itemRating === rating.value
                                                        ? "bg-slate-800 border border-green-500/50 scale-110 shadow-lg shadow-green-500/10"
                                                        : "opacity-40 hover:opacity-100 grayscale hover:grayscale-0 hover:bg-slate-800"
                                                )}
                                            >
                                                {rating.emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                </div>

                {/* Sticky Finish Training Footer */}
                <AnimatePresence>
                    {allCompleted && (
                        <motion.div
                            className="sticky bottom-0 p-4 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                        >
                            <div className="max-w-3xl mx-auto">
                                <button
                                    onClick={handleFinalize}
                                    disabled={isUploading}
                                    className={cn(
                                        "w-full py-5 bg-green-500 hover:bg-green-400 text-slate-900 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/20 active:scale-[0.98]",
                                        isUploading && "opacity-80 cursor-wait bg-green-600 hover:bg-green-600"
                                    )}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Saving block info...
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="w-6 h-6" />
                                            Finish Training
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={handleBackToList} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white group flex items-center gap-2 pr-4">
                        <ChevronLeft className="w-6 h-6" />
                        <span className="text-sm font-medium">Back to List</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">{sessionTitle}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>Exercise {currentIndex + 1} of {exercises.length}</span>
                            <span className="text-slate-600">•</span>
                            <span className={cn(
                                "capitalize font-medium",
                                currentExercise.block === 'warm-up' && "text-orange-400",
                                currentExercise.block === 'technical' && "text-blue-400",
                                currentExercise.block === 'situational' && "text-purple-400",
                                currentExercise.block === 'competitive' && "text-red-400",
                                currentExercise.block === 'cool-down' && "text-teal-400"
                            )}>
                                {currentExercise.block.replace('-', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsTacticalBoardOpen(true)}
                        className="p-2 bg-slate-800 hover:bg-green-500 hover:text-slate-900 text-green-500 rounded-xl transition flex items-center gap-2"
                        title="Open Tactical Board"
                    >
                        <CourtIcon className="w-5 h-5" />
                    </button>

                    <div className="hidden md:flex flex-col items-end mr-4">
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-green-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <span className="text-xs text-slate-500 mt-1">{Math.round(progress)}% Complete</span>
                    </div>

                    <button
                        onClick={toggleComplete}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all transform active:scale-95 shadow-lg",
                            isCompleted
                                ? "bg-green-500 text-slate-900 hover:bg-green-400"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                        )}
                    >
                        <CheckCircle className={cn("w-5 h-5", isCompleted && "fill-current")} />
                        {isCompleted ? "Completed" : "Mark Complete"}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* Left: Exercise Demo & Visuals */}
                <div className="flex-1 bg-black/50 relative flex flex-col">
                    {/* Demo Area */}
                    <div className="flex-1 flex items-center justify-center p-8 bg-slate-900/50 m-4 rounded-3xl border border-slate-800 relative overflow-hidden group">
                        {/* Placeholder for Video/Diagram */}
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-green-500/10 border border-slate-700">
                                <Play className="w-8 h-8 text-green-500 ml-1" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-300">Exercise Demo</h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                                Video demonstration or tactical diagram for &quot;{currentExercise.exercise?.title}&quot; would appear here.
                            </p>
                        </div>

                        {/* Exercise Tags Overlay */}
                        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                            {(currentExercise.exercise?.focusAreas || []).map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold uppercase backdrop-blur-md border border-white/10">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Controls (Mobile Bottom / Desktop Floating) */}
                    <div className="p-6 flex justify-between items-center max-w-4xl mx-auto w-full">
                        <button
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="p-4 rounded-full bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition border border-slate-700"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div className="text-center md:hidden">
                            <span className="text-sm font-bold text-white">
                                {currentIndex + 1} / {exercises.length}
                            </span>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={currentIndex === exercises.length - 1}
                            className="p-4 rounded-full bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition border border-slate-700"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Right: Details & Coach Input */}
                <div className="w-full md:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* Description */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-3">{currentExercise.exercise?.title}</h2>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                {currentExercise.exercise?.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Duration</div>
                                    <div className="text-lg font-mono text-white flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        {currentExercise.duration || 10}:00
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Intensity</div>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className={cn("h-2 w-6 rounded-full",
                                                i === 0 ? "bg-green-500" :
                                                    i === 1 && (['medium', 'hard'].includes(currentExercise.exercise?.difficulty || '')) ? "bg-yellow-500" :
                                                        i === 2 && currentExercise.exercise?.difficulty === 'hard' ? "bg-red-500" : "bg-slate-700"
                                            )} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coach's Corner */}
                        <div className="space-y-4 pb-20 md:pb-0">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-t border-slate-800 pt-6">
                                <MessageSquare className="w-4 h-4" />
                                Coach&apos;s Feedback
                            </h3>

                            {/* Rating */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-300">Quick Rating</label>
                                <div className="flex gap-3">
                                    {[
                                        { value: 1, emoji: '😫', label: 'Bad' },
                                        { value: 2, emoji: '😐', label: 'Okay' },
                                        { value: 3, emoji: '🙂', label: 'Good' },
                                        { value: 4, emoji: '🤩', label: 'Great' }
                                    ].map((rating) => (
                                        <button
                                            key={rating.value}
                                            onClick={() => setRatings(prev => ({ ...prev, [currentIndex]: rating.value }))}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl text-2xl transition-all border border-slate-700 bg-slate-800/30 hover:bg-slate-800",
                                                ratings[currentIndex] === rating.value
                                                    ? "bg-slate-800 border-green-500 scale-105 shadow-lg shadow-green-500/10"
                                                    : "opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
                                            )}
                                            title={rating.label}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span>{rating.emoji}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{rating.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Completion Action (Visible in Flow) */}
                            <button
                                onClick={toggleComplete}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
                                    isCompleted
                                        ? "bg-green-500 text-slate-900 hover:bg-green-400 shadow-green-500/20"
                                        : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                                )}
                            >
                                <CheckCircle className={cn("w-5 h-5", isCompleted && "fill-current")} />
                                {isCompleted ? "Exercise Completed" : "Mark Exercise Complete"}
                            </button>

                            {/* Finish Training in Detail View */}
                            {allCompleted && (
                                <button
                                    onClick={handleFinalize}
                                    disabled={isUploading}
                                    className={cn(
                                        "w-full py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95",
                                        isUploading && "opacity-80 cursor-wait bg-green-600 hover:bg-green-600"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Trophy className="w-5 h-5" />
                                    )}
                                    {isUploading ? "Uploading Videos..." : "Finish Training"}
                                </button>
                            )}


                            {/* Notes Input */}
                            <div className="space-y-2 mt-8 md:mt-2">
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 md:hidden"/> Observation Notes
                                </label>
                                <textarea
                                    className="w-full h-32 bg-slate-900 md:bg-slate-800 border border-slate-800 md:border-slate-700 rounded-2xl md:rounded-xl p-5 md:p-4 text-base md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none transition-all shadow-inner"
                                    placeholder="Add notes about player performance, technical corrections..."
                                    value={notes[currentIndex] || ''}
                                    onChange={(e) => setNotes(prev => ({ ...prev, [currentIndex]: e.target.value }))}
                                />
                            </div>

                            {/* Video Upload */}
                            <div className="space-y-2 pb-12 overflow-hidden">
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileVideo className="w-4 h-4 md:hidden"/> Attach Technical Video
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        id={`video-upload-${currentIndex}`}
                                        onChange={handleFileUpload}
                                    />
                                    <label
                                        htmlFor={`video-upload-${currentIndex}`}
                                        className={cn(
                                            "flex flex-col items-center justify-center w-full h-32 md:h-24 border-2 border-dashed rounded-2xl md:rounded-xl cursor-pointer transition-all",
                                            uploads[currentIndex]
                                                ? "border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                                                : "border-slate-700 bg-slate-900/50 md:bg-slate-800/30 hover:bg-slate-800 hover:border-slate-500"
                                        )}
                                    >
                                        {uploads[currentIndex] ? (
                                            <div className="flex flex-col items-center gap-2 text-green-400">
                                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="w-6 h-6" />
                                                </div>
                                                <span className="text-sm font-bold truncate max-w-[200px]">{uploads[currentIndex]?.name}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 md:w-5 md:h-5 text-green-500 md:text-slate-500 mb-3 md:mb-2 group-hover:text-green-400 transition-colors" />
                                                <span className="text-sm md:text-xs text-white md:text-slate-500 group-hover:text-slate-300 transition-colors font-bold md:font-normal">Tap to upload analysis video</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TacticalBoard
                isOpen={isTacticalBoardOpen}
                onClose={() => setIsTacticalBoardOpen(false)}
            />
        </div >
    );
}
