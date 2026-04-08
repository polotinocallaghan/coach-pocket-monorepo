'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Sparkles, LayoutGrid, Calendar, Video, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@coach-pocket/core';

const ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Coach Pocket 3.0',
        subtitle: 'The professional tennis coaching platform designed to elevate your methodology and player development.',
        icon: Sparkles,
        color: 'from-blue-500 to-cyan-500',
        image: '🎾',
    },
    {
        id: 'library',
        title: 'Smart Drill Library',
        subtitle: 'Access hundreds of professional drills, create custom patterns, and build templates for any scenario.',
        icon: BookOpen,
        color: 'from-purple-500 to-indigo-500',
        image: '📚',
    },
    {
        id: 'builder',
        title: 'Advanced Session Builder',
        subtitle: 'Design tailored practice sessions in seconds. Distribute them instantly to your players and teams.',
        icon: LayoutGrid,
        color: 'from-orange-500 to-red-500',
        image: '⚙️',
    },
    {
        id: 'video',
        title: 'Match Video Feedback',
        subtitle: 'Upload match footage, clip critical micro-moments, and deliver precise technical and tactical feedback.',
        icon: Video,
        color: 'from-pink-500 to-rose-500',
        image: '📹',
    },
    {
        id: 'calendar',
        title: 'Interactive Calendar',
        subtitle: 'Manage your entire coaching schedule. Track individual programs, team practices, and match days seamlessly.',
        icon: Calendar,
        color: 'from-green-500 to-emerald-500',
        image: '📅',
    }
];

export default function OnboardingWizard() {
    const router = useRouter();
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        // Do not show onboarding if user is not logged in
        if (!user) return;

        // Check if user has already seen onboarding
        const hasSeen = localStorage.getItem('coach_pocket_onboarding_completed');
        if (!hasSeen) {
            // Add a small delay for smoother entrance
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('coach_pocket_onboarding_completed', 'true');
        setIsVisible(false);
        // We can route them to the dashboard or let them stay where they are
        router.push('/');
    };

    if (!isVisible) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 sm:p-6"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: -20, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
                >
                    {/* Background Ambient Glow */}
                    <div className={cn(
                        "absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br opacity-20 blur-[100px] transition-colors duration-700 pointer-events-none",
                        step.color
                    )} />

                    {/* Skip Button */}
                    <button
                        onClick={handleComplete}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors z-20 backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Content Container */}
                    <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 text-center relative z-10 w-full overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center w-full"
                            >
                                {/* Step Icon/Graphic */}
                                <div className="mb-8 relative">
                                    <div className={cn(
                                        "w-32 h-32 rounded-3xl bg-gradient-to-br flex items-center justify-center text-5xl shadow-lg ring-1 ring-white/20 transform -rotate-6",
                                        step.color
                                    )}>
                                        <div className="transform rotate-6 text-white drop-shadow-lg">
                                            {step.image}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-xl">
                                        <step.icon className={cn(
                                            "w-8 h-8",
                                            currentStep === 0 ? "text-cyan-400" :
                                                currentStep === 1 ? "text-indigo-400" :
                                                    currentStep === 2 ? "text-rose-400" :
                                                        currentStep === 3 ? "text-pink-400" :
                                                            "text-emerald-400"
                                        )} />
                                    </div>
                                </div>

                                {/* Text Content */}
                                <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
                                    {step.title}
                                </h2>
                                <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
                                    {step.subtitle}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-700 relative z-20 flex items-center justify-between">
                        {/* Progress Indicators */}
                        <div className="flex gap-2">
                            {ONBOARDING_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-300",
                                        idx === currentStep
                                            ? "w-8 bg-green-500"
                                            : "w-2 bg-slate-700"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-3">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrevious}
                                    className="p-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl",
                                    isLastStep
                                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105"
                                        : "bg-green-600 hover:bg-green-500 text-white"
                                )}
                            >
                                {isLastStep ? (
                                    <>
                                        Get Started
                                        <Check className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
