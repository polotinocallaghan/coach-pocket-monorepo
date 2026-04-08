'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Brain, Target, Crosshair, Dumbbell, Activity, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrainingPreferences, TrainingPreferenceFeature } from '@coach-pocket/core';

const DEFAULT_PREFERENCES: TrainingPreferences = {
    rallies: { value: 3, isPriority: false },
    points: { value: 3, isPriority: false },
    technique: { value: 3, isPriority: false },
    tactics: { value: 3, isPriority: false },
    baskets: { value: 3, isPriority: false },
    serves: { value: 3, isPriority: false },
};

type ColorMap = {
    text: string;
    textHover: string;
    bgHover: string;
    bgActive: string;
    borderActive: string;
    shadow: string;
    gradientFrom: string;
    gradientTo: string;
    shadowGradient: string;
};

const COLORS: Record<string, ColorMap> = {
    emerald: {
        text: 'text-emerald-400', textHover: 'group-hover:text-emerald-400', bgHover: 'hover:bg-emerald-500/10',
        bgActive: 'bg-emerald-500/20', borderActive: 'border-emerald-500/30', shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
        gradientFrom: 'from-emerald-600/50', gradientTo: 'to-emerald-500', shadowGradient: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    },
    red: {
        text: 'text-red-400', textHover: 'group-hover:text-red-400', bgHover: 'hover:bg-red-500/10',
        bgActive: 'bg-red-500/20', borderActive: 'border-red-500/30', shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
        gradientFrom: 'from-red-600/50', gradientTo: 'to-red-500', shadowGradient: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]'
    },
    blue: {
        text: 'text-blue-400', textHover: 'group-hover:text-blue-400', bgHover: 'hover:bg-blue-500/10',
        bgActive: 'bg-blue-500/20', borderActive: 'border-blue-500/30', shadow: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
        gradientFrom: 'from-blue-600/50', gradientTo: 'to-blue-500', shadowGradient: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'
    },
    purple: {
        text: 'text-purple-400', textHover: 'group-hover:text-purple-400', bgHover: 'hover:bg-purple-500/10',
        bgActive: 'bg-purple-500/20', borderActive: 'border-purple-500/30', shadow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
        gradientFrom: 'from-purple-600/50', gradientTo: 'to-purple-500', shadowGradient: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]'
    },
    orange: {
        text: 'text-orange-400', textHover: 'group-hover:text-orange-400', bgHover: 'hover:bg-orange-500/10',
        bgActive: 'bg-orange-500/20', borderActive: 'border-orange-500/30', shadow: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
        gradientFrom: 'from-orange-600/50', gradientTo: 'to-orange-500', shadowGradient: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]'
    },
    cyan: {
        text: 'text-cyan-400', textHover: 'group-hover:text-cyan-400', bgHover: 'hover:bg-cyan-500/10',
        bgActive: 'bg-cyan-500/20', borderActive: 'border-cyan-500/30', shadow: 'shadow-[0_0_8px_rgba(6,182,212,0.3)]',
        gradientFrom: 'from-cyan-600/50', gradientTo: 'to-cyan-500', shadowGradient: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]'
    }
};

const FEATURES = [
    { key: 'rallies', label: 'Rallies', icon: Activity, colorKey: 'emerald' },
    { key: 'points', label: 'Points Play', icon: Target, colorKey: 'red' },
    { key: 'technique', label: 'Technique', icon: Dumbbell, colorKey: 'blue' },
    { key: 'tactics', label: 'Tactics', icon: Brain, colorKey: 'purple' },
    { key: 'baskets', label: 'Baskets (Feeding)', icon: Crosshair, colorKey: 'orange' },
    { key: 'serves', label: 'Serves & Returns', icon: Shield, colorKey: 'cyan' },
] as const;

/* ── INTERACTIVE EDITOR FOR PLAYER ── */
export function TrainingPreferencesEditor({ 
    initialPreferences, 
    onSave 
}: { 
    initialPreferences?: TrainingPreferences; 
    onSave: (val: TrainingPreferences) => void;
}) {
    const [prefs, setPrefs] = useState<TrainingPreferences>(initialPreferences || DEFAULT_PREFERENCES);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const updateFeature = (key: keyof TrainingPreferences, updater: Partial<TrainingPreferenceFeature>) => {
        setPrefs(prev => ({
            ...prev,
            [key]: { ...prev[key], ...updater }
        }));
        setHasUnsaved(true);
    };

    const handleSave = () => {
        onSave(prefs);
        setHasUnsaved(false);
    };

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        Training Preferences
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Let your coach know what you enjoy and want to focus on.</p>
                </div>
                {hasUnsaved && (
                    <button 
                        onClick={handleSave}
                        className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 transition-all border border-green-400/30"
                    >
                        Save Preferences
                    </button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {FEATURES.map(f => {
                    const current = prefs[f.key as keyof TrainingPreferences];
                    const Icon = f.icon;
                    const colors = COLORS[f.colorKey];
                    return (
                        <div key={f.key} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-slate-700 transition">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon className={cn("w-4 h-4 text-slate-500 transition-colors", colors.textHover)} />
                                    <span className="font-semibold text-white truncate text-sm">{f.label}</span>
                                </div>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => updateFeature(f.key as keyof TrainingPreferences, { value: val })}
                                            className={cn(
                                                "w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-all",
                                                current.value >= val 
                                                    ? cn(colors.bgActive, colors.text, "border", colors.borderActive)
                                                    : "bg-slate-800 text-slate-500 hover:bg-slate-700 border border-transparent",
                                                current.value === val && colors.shadow
                                            )}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="ml-4 pl-4 border-l border-slate-800 flex flex-col items-center gap-1.5">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Priority</span>
                                <button 
                                    onClick={() => updateFeature(f.key as keyof TrainingPreferences, { isPriority: !current.isPriority })}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        current.isPriority 
                                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]" 
                                            : "bg-slate-800 text-slate-600 hover:bg-slate-700 border border-slate-700"
                                    )}
                                    title={current.isPriority ? "Marked as priority" : "Mark as priority"}
                                >
                                    <Flame className={cn("w-4 h-4", current.isPriority && "fill-orange-400/20")} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── READ-ONLY VIEWER FOR COACH ── */
export function TrainingPreferencesViewer({ preferences }: { preferences?: TrainingPreferences }) {
    if (!preferences) {
        return (
            <div className="bg-slate-800/30 border border-slate-800/80 border-dashed rounded-2xl p-6 text-center">
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3 opacity-50" />
                <h3 className="text-sm font-bold text-slate-400">No Preferences Set</h3>
                <p className="text-xs text-slate-500 mt-1">Player hasn't configured their training preferences yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">Player Insights</h3>
                    <p className="text-xs text-slate-400 font-medium">Training preferences and priorities</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col space-y-4">
                {FEATURES.map(f => {
                    const current = preferences[f.key as keyof TrainingPreferences];
                    const percentage = (current.value / 5) * 100;
                    const Icon = f.icon;
                    const colors = COLORS[f.colorKey];

                    return (
                        <div key={f.key} className="flex items-center gap-4 group">
                            <div className="w-32 flex items-center gap-2">
                                <Icon className={cn("w-4 h-4 text-slate-500 transition-colors", colors.textHover)} />
                                <span className="text-xs font-semibold text-slate-300">{f.label}</span>
                            </div>
                            
                            <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={cn(
                                        "h-full rounded-full relative bg-gradient-to-r",
                                        colors.gradientFrom,
                                        colors.gradientTo,
                                        current.isPriority && colors.shadowGradient
                                    )}
                                >
                                </motion.div>
                            </div>

                            <div className="flex items-center w-8 justify-end">
                                {current.isPriority ? (
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-full" />
                                        <Flame className="w-4 h-4 text-orange-400 relative z-10 fill-orange-400/20" />
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-slate-500">{current.value}/5</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
