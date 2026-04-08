'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Mail, Link as LinkIcon, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@coach-pocket/core';
import { cn } from '@/lib/utils';
import { dataStore } from '@coach-pocket/core';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InvitationModal({ isOpen, onClose }: InvitationModalProps) {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'link' | 'email'>('email');
    const [playerEmail, setPlayerEmail] = useState('');

    // Email Send States
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [sendError, setSendError] = useState('');

    const coachName = useMemo(() => {
        return dataStore.getUserProfile()?.name || user?.displayName || 'Your Coach';
    }, [user]);

    if (!isOpen || !user) return null;

    // Generate link: your-app.com/signup?role=player&coachId=USER_ID
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}/signup?role=player&coachId=${user.uid}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        if (!playerEmail) {
            setSendError('Please enter an email address.');
            return;
        }

        setIsSending(true);
        setSendError('');
        setSendSuccess(false);

        try {
            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: playerEmail,
                    coachName,
                    inviteLink
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email.');
            }

            setSendSuccess(true);
            setPlayerEmail(''); // clear the form

            // Auto close after showing success for a bit
            setTimeout(() => {
                onClose();
                setSendSuccess(false);
            }, 3000);

        } catch (error: any) {
            setSendError(error.message || 'Something went wrong.');
            console.error('Email send failed:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Invite Player</h2>
                        <p className="text-sm text-slate-400 mt-1">Get your athletes on the platform</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('email')}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2",
                            activeTab === 'email' ? "text-green-400 border-b-2 border-green-500 bg-green-500/5" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                        )}
                    >
                        <Mail className="w-4 h-4" />
                        Send via Email
                    </button>
                    <button
                        onClick={() => setActiveTab('link')}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2",
                            activeTab === 'link' ? "text-green-400 border-b-2 border-green-500 bg-green-500/5" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                        )}
                    >
                        <LinkIcon className="w-4 h-4" />
                        Copy Magic Link
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'email' ? (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <p className="text-slate-300 text-sm mb-4">
                                    Send a professional welcome email directly to your player. This email will contain their unique magic sign-in link automatically.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Player's Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                        <input
                                            type="email"
                                            value={playerEmail}
                                            onChange={(e) => setPlayerEmail(e.target.value)}
                                            disabled={isSending || sendSuccess}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50"
                                            placeholder="player@example.com"
                                        />
                                    </div>
                                    {sendError && (
                                        <p className="text-red-400 text-xs ml-1 font-medium">{sendError}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={isSending || sendSuccess}
                                    className={cn(
                                        "w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all transform flex items-center justify-center gap-2 mt-4",
                                        sendSuccess
                                            ? "bg-green-600 shadow-green-500/20"
                                            : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]",
                                        (isSending || sendSuccess) && "opacity-90 cursor-not-allowed transform-none"
                                    )}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending Email...
                                        </>
                                    ) : sendSuccess ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Email Sent!
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Invite Email
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="link"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                <p className="text-slate-300 text-sm">
                                    Alternatively, copy this magic sign-in link and text it to your player via WhatsApp, SMS, or any other messaging platform.
                                </p>

                                {/* Link Box */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                                    <LinkIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                    <code className="text-sm text-green-400 font-mono flex-1 truncate">
                                        {inviteLink}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition relative bg-slate-800"
                                        title="Copy Link"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Info Alert */}
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 mt-6">
                        <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <div className="text-xs text-blue-200">
                            When players register via this invitation, their account is permanently locked to <strong>Player Mode</strong>. It will automatically link to your coaching profile.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
