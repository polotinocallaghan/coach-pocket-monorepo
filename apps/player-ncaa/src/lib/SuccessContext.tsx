'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SuccessContextType {
    showSuccess: (message: string, redirectUrl?: string | null) => void;
}

const SuccessContext = createContext<SuccessContextType | undefined>(undefined);

export function SuccessProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
    const router = useRouter();

    const showSuccess = (msg: string, redirectUrl: string | null = '/') => {
        setMessage(msg);
        setRedirectTarget(redirectUrl);
        setIsVisible(true);

        setTimeout(() => {
            setIsVisible(false);
            if (redirectUrl) {
                router.push(redirectUrl);
            }
        }, 2000); // 2 seconds delay
    };

    return (
        <SuccessContext.Provider value={{ showSuccess }}>
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: -20 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                            className="flex flex-col items-center bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl"
                        >
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
                                >
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                </motion.div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">{message}</h2>
                            {redirectTarget && (
                                <p className="text-slate-400">Loading...</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SuccessContext.Provider>
    );
}

export function useSuccess() {
    const context = useContext(SuccessContext);
    if (context === undefined) {
        throw new Error('useSuccess must be used within a SuccessProvider');
    }
    return context;
}
