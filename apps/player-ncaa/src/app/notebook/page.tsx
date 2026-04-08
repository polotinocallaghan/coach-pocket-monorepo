'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Book, Brain, Shield, Crosshair, ChevronDown, ChevronRight, 
    Save, Users, Search, User, Check, Edit2, Loader2 
} from 'lucide-react';
import { dataStore, NotebookNote, Team, TeamMember } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { cn } from '@/lib/utils';

const TECHNICAL_SUBCATEGORIES = [
    { id: 'derecha', label: 'Derecha', icon: '🎾' },
    { id: 'reves', label: 'Revés', icon: '🎾' },
    { id: 'saque', label: 'Saque', icon: '⚡' },
    { id: 'cortado', label: 'Cortado', icon: '💨' },
    { id: 'resto', label: 'Resto', icon: '🛡️' },
    { id: 'volea', label: 'Volea', icon: '✋' },
    { id: 'smash', label: 'Smash', icon: '💥' }
];

export default function NotebookPage() {
    const { user } = useAuth();
    const [notebookMode, setNotebookMode] = useState<'personal' | 'player'>('player');
    
    // Selection state
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<TeamMember | null>(null);
    
    // Category state
    const [activeCategory, setActiveCategory] = useState<'mental' | 'technical' | 'tactical'>('mental');
    const [activeSubCategory, setActiveSubCategory] = useState<string>('derecha');

    // UI State
    const [teams, setTeams] = useState<Team[]>([]);
    const [noteContent, setNoteContent] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);

    useEffect(() => {
        setTeams(dataStore.getTeams());
    }, []);

    const isPlayerRole = dataStore.getEffectiveRole() === 'player';
    
    // Determine targetId based on selection
    const targetId = isPlayerRole 
        ? (user?.uid || 'current-player')
        : (notebookMode === 'personal' ? 'general' : (selectedPlayer?.id || ''));

    // Load note for active combination
    useEffect(() => {
        if (!isPlayerRole && notebookMode === 'player' && !selectedPlayer) {
            setNoteContent('');
            return;
        }

        const note = dataStore.getNotebookNoteSingle(
            targetId, 
            activeCategory, 
            activeCategory === 'technical' ? activeSubCategory : ''
        );
        setNoteContent(note?.content || '');
    }, [notebookMode, selectedPlayer, activeCategory, activeSubCategory, targetId]);

    const handleSaveNote = () => {
        if (!isPlayerRole && notebookMode === 'player' && !selectedPlayer) return;

        setIsSaving(true);
        dataStore.saveNotebookNoteSingle(
            targetId,
            activeCategory,
            activeCategory === 'technical' ? activeSubCategory : '',
            noteContent
        );

        setTimeout(() => {
            setIsSaving(false);
            setSaveFeedback(true);
            setTimeout(() => setSaveFeedback(false), 2000);
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white pb-20">
            {/* Header Sticky */}
            <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 p-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Book className="w-6 h-6 text-green-400" />
                        <h1 className="text-xl font-bold">
                            {dataStore.getEffectiveRole() === 'player' 
                                ? "Player's Notebook" 
                                : notebookMode === 'player' 
                                    ? "Players Notebook" 
                                    : "Personal Notebook"}
                        </h1>
                    </div>

                    {/* Mode Toggle Layout */}
                    {dataStore.getEffectiveRole() !== 'player' && (
                        <div className="flex bg-slate-800/80 p-1 rounded-full border border-slate-700/30 w-full sm:w-auto">
                            <button
                                onClick={() => setNotebookMode('personal')}
                                className={cn(
                                    "flex-1 sm:flex-none px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    notebookMode === 'personal' ? "bg-green-500 text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Brain className="w-4 h-4" /> Personal
                            </button>
                            <button
                                onClick={() => setNotebookMode('player')}
                                className={cn(
                                    "flex-1 sm:flex-none px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    notebookMode === 'player' ? "bg-green-500 text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <User className="w-4 h-4" /> Players
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Navigation: Teams & Players (if in player mode) */}
                {notebookMode === 'player' && !isPlayerRole && (
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30 backdrop-blur-sm">
                            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase flex items-center gap-1">
                                <Users className="w-4 h-4" /> Teams / Players
                            </h3>

                            {teams.length === 0 ? (
                                <p className="text-xs text-slate-500">No teams loaded. Go to Teams/Groups page to create categories.</p>
                            ) : (
                                <div className="space-y-2">
                                    {teams.map(team => (
                                        <div key={team.id} className="space-y-1">
                                            <button
                                                onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                                                className={cn(
                                                    "w-full flex justify-between items-center p-3 rounded-xl transition-all text-left font-semibold",
                                                    selectedTeam?.id === team.id ? "bg-slate-700/50 text-white" : "text-slate-300 hover:bg-slate-800/80"
                                                )}
                                            >
                                                <span>{team.name}</span>
                                                {selectedTeam?.id === team.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>

                                            <AnimatePresence>
                                                {selectedTeam?.id === team.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="pl-4 space-y-1 overflow-hidden"
                                                    >
                                                        {team.members.map(member => (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => setSelectedPlayer(member)}
                                                                className={cn(
                                                                    "w-full text-left p-2.5 rounded-xl text-sm transition-all flex items-center gap-2",
                                                                    selectedPlayer?.id === member.id 
                                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30 font-semibold" 
                                                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                                                )}
                                                            >
                                                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                                                                {member.name}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Center Workspace */}
                <div className={cn(notebookMode === 'personal' || isPlayerRole ? "lg:col-span-12" : "lg:col-span-9")}>
                    {notebookMode === 'player' && !isPlayerRole && !selectedPlayer ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-3xl border border-slate-800">
                            <Book className="w-12 h-12 opacity-20 mb-4" />
                            <p className="text-lg font-medium">Select a Player to view their notebook</p>
                            <p className="text-xs mt-1 opacity-70">Pick a team and select individual on the left panel.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Profile Target Badge (in player mode) */}
                            {notebookMode === 'player' && !isPlayerRole && selectedPlayer && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30 backdrop-blur-sm flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                                        {selectedPlayer.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-white mb-0.5">{selectedPlayer.name}</h2>
                                        <p className="text-xs text-slate-400">Personal notebook file & specific views</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Main Categories Navigation */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/30 backdrop-blur-sm">
                                {[
                                    { id: 'mental', label: 'Mental', icon: <Brain className="w-4 h-4" /> },
                                    { id: 'technical', label: 'Technical', icon: <Shield className="w-4 h-4" /> },
                                    { id: 'tactical', label: 'Tactical', icon: <Crosshair className="w-4 h-4" /> }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id as any)}
                                        className={cn(
                                            "flex flex-col sm:flex-row items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl text-sm font-semibold transition-all",
                                            activeCategory === cat.id 
                                                ? "bg-slate-700 text-white border border-slate-600 shadow-md" 
                                                : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {cat.icon}
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* SubCategories (Only Technical) */}
                            <AnimatePresence>
                                {activeCategory === 'technical' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-slate-800/30 rounded-2xl p-2 border border-slate-700/20 backdrop-blur-sm flex flex-wrap gap-1.5"
                                    >
                                        {TECHNICAL_SUBCATEGORIES.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => setActiveSubCategory(sub.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5",
                                                    activeSubCategory === sub.id 
                                                        ? "bg-green-500 text-slate-900 font-bold shadow-md" 
                                                        : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/50"
                                                )}
                                            >
                                                <span>{sub.icon}</span> <span>{sub.label}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Continuous Notepad view */}
                            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/30 backdrop-blur-sm overflow-hidden flex flex-col min-h-[50vh] shadow-xl">
                                <div className="p-4 border-b border-slate-700/40 flex justify-between items-center bg-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                                        <span className="text-sm font-bold uppercase tracking-wide text-slate-200">
                                            {activeCategory === 'technical' 
                                                ? `${TECHNICAL_SUBCATEGORIES.find(s => s.id === activeSubCategory)?.label} Notes` 
                                                : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Notes`}
                                        </span>
                                    </div>

                                    {/* Action Header saves */}
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSaving}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                                            saveFeedback 
                                                ? "bg-green-600 text-white" 
                                                : "bg-slate-200 text-slate-900 hover:bg-white"
                                        )}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : saveFeedback ? (
                                            <Check className="w-3.5 h-3.5" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5" />
                                        )}
                                        {saveFeedback ? 'Saved!' : 'Save'}
                                    </button>
                                </div>

                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder={`Write your ${activeCategory} ${activeCategory === 'technical' ? activeSubCategory : ''} thoughts, guidelines, or ideas here...`}
                                    className="flex-1 w-full p-6 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-sans leading-relaxed text-base"
                                    style={{ 
                                        background: "repeating-linear-gradient(transparent, transparent 27px, rgba(51, 65, 85, 0.2) 27px, rgba(51, 65, 85, 0.2) 28px)",
                                        lineHeight: "28px",
                                        paddingTop: "14px"
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
