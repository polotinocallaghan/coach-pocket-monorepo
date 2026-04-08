'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { dataStore, TrainingProgram, ProgramWeek, WeekDay, Session, Exercise } from '@coach-pocket/core';
import { generateId, cn } from '@/lib/utils';
import {
    ArrowLeft, Calendar, ChevronRight, ChevronDown, Layers, Zap,
    Target, TrendingUp, Play, Save, Plus, Trash2, Clock,
    Users, Signal, ChevronLeft, Sparkles, Check, X, Dumbbell,
    Search, Filter, GripVertical, Copy, BookMarked, BarChart2
} from 'lucide-react';
import { useSuccess } from '@/lib/SuccessContext';
import { useLanguage } from '@/lib/LanguageContext';

const DAY_NAMES_KEYS = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
const DAY_NAMES_FULL_KEYS = ['day.sunday', 'day.monday', 'day.tuesday', 'day.wednesday', 'day.thursday', 'day.friday', 'day.saturday'];

const FOCUS_OPTIONS_KEYS = [
    { value: 'technical', labelKey: 'focusOpt.technical', icon: '🎾', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { value: 'tactical', labelKey: 'focusOpt.tactical', icon: '🧠', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
    { value: 'physical', labelKey: 'focusOpt.physical', icon: '💪', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    { value: 'match-play', labelKey: 'focusOpt.matchPlay', icon: '🏆', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
    { value: 'recovery', labelKey: 'focusOpt.recovery', icon: '🧘', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
    { value: 'serve', labelKey: 'focusOpt.serve', icon: '🎯', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
];

const WEEK_THEME_KEYS = [
    'weekTheme.fundamentals', 'weekTheme.patternDevelopment', 'weekTheme.pointConstruction',
    'weekTheme.matchSimulation', 'weekTheme.competitiveIntensity', 'weekTheme.recoveryAnalysis',
    'weekTheme.technicalProgression', 'weekTheme.tacticalPressure',
];

const LEVEL_OPTIONS_KEYS = [
    { value: 'beginner', labelKey: 'level.beginner', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { value: 'intermediate', labelKey: 'level.intermediate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'advanced', labelKey: 'level.advanced', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 'pro', labelKey: 'level.pro', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

function generateProgressiveWeeks(totalWeeks: number, daysPerWeek: number, trainingDays: number[]): ProgramWeek[] {
    const progressionThemes = [
        { themeKey: 'prog.technicalFundamentals', objectiveKey: 'prog.technicalObj', focusDefault: 'technical', intensity: 'low' as const },
        { themeKey: 'prog.patternDevelopment', objectiveKey: 'prog.patternObj', focusDefault: 'tactical', intensity: 'medium' as const },
        { themeKey: 'prog.pointConstruction', objectiveKey: 'prog.pointObj', focusDefault: 'tactical', intensity: 'medium' as const },
        { themeKey: 'prog.matchSimulation', objectiveKey: 'prog.matchObj', focusDefault: 'match-play', intensity: 'high' as const },
    ];

    const weeks: ProgramWeek[] = [];
    for (let w = 0; w < totalWeeks; w++) {
        const progressionIdx = Math.min(Math.floor(w / (totalWeeks / progressionThemes.length)), progressionThemes.length - 1);
        const prog = progressionThemes[progressionIdx];

        const days: WeekDay[] = trainingDays.slice(0, daysPerWeek).map((dayOfWeek, i) => {
            const dayFocuses = ['technical', 'tactical', 'match-play', 'physical', 'serve'];
            let focus = prog.focusDefault;
            if (daysPerWeek > 1 && i > 0) {
                focus = w >= totalWeeks - Math.ceil(totalWeeks / 4) ? 'match-play' : dayFocuses[Math.min(i, dayFocuses.length - 1)];
            }
            return { dayOfWeek, focus, intensity: prog.intensity };
        });

        weeks.push({
            weekNumber: w + 1,
            theme: prog.themeKey,
            objective: prog.objectiveKey,
            days,
        });
    }
    return weeks;
}

// ── Load Chart SVG ──────────────────────────────────────────────────────────────
function LoadChart({ weeks, onClickWeek }: { weeks: ProgramWeek[]; onClickWeek: (i: number) => void }) {
    if (weeks.length === 0) return null;
    const W = 560, H = 80, PADX = 16, PADY = 10;
    const scores = weeks.map(w =>
        w.days.reduce((s, d) => s + (d.intensity === 'high' ? 3 : d.intensity === 'medium' ? 2 : 1), 0) / (w.days.length || 1)
    );
    const min = 1, max = 3;
    const toX = (i: number) => PADX + (i / Math.max(weeks.length - 1, 1)) * (W - PADX * 2);
    const toY = (v: number) => PADY + ((max - v) / (max - min)) * (H - PADY * 2);

    const pts = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ');
    const fill = `${scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ')} ${toX(weeks.length - 1)},${H} ${toX(0)},${H}`;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Workload Curve</span>
                <span className="text-[10px] text-slate-600 ml-auto">Click a point to jump to that week</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
                <defs>
                    <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* grid lines */}
                {[1, 2, 3].map(v => (
                    <line key={v} x1={PADX} y1={toY(v)} x2={W - PADX} y2={toY(v)}
                        stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                ))}
                {/* fill */}
                <polygon points={fill} fill="url(#loadGrad)" />
                {/* line */}
                <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
                {/* dots */}
                {scores.map((s, i) => {
                    const col = s >= 2.5 ? '#ef4444' : s >= 1.5 ? '#f59e0b' : '#22c55e';
                    return (
                        <g key={i} onClick={() => onClickWeek(i)} style={{ cursor: 'pointer' }}>
                            <circle cx={toX(i)} cy={toY(s)} r={10} fill="transparent" />
                            <circle cx={toX(i)} cy={toY(s)} r={4} fill={col} stroke="#1e293b" strokeWidth="2" />
                            <text x={toX(i)} y={H - 1} textAnchor="middle" fill="#475569" fontSize="8">
                                W{i + 1}
                            </text>
                        </g>
                    );
                })}
                {/* Y labels */}
                <text x={PADX - 2} y={toY(3) + 3} textAnchor="end" fill="#475569" fontSize="8">Hi</text>
                <text x={PADX - 2} y={toY(2) + 3} textAnchor="end" fill="#475569" fontSize="8">Md</text>
                <text x={PADX - 2} y={toY(1) + 3} textAnchor="end" fill="#475569" fontSize="8">Lo</text>
            </svg>
        </div>
    );
}

type Step = 'setup' | 'weeks' | 'review';

export default function ProgramBuilderPage() {
    const router = useRouter();
    const { showSuccess } = useSuccess();
    const { t, language } = useLanguage();
    const [step, setStep] = useState<Step>('setup');

    // Config state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [totalWeeks, setTotalWeeks] = useState(4);

    const [level, setLevel] = useState<string>('intermediate');
    const [assignedTo, setAssignedTo] = useState('');
    const [startDate, setStartDate] = useState(getNextMonday());
    const [trainingDays, setTrainingDays] = useState<number[]>([1, 3]);

    const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const [exercisePickerOpen, setExercisePickerOpen] = useState<{ weekIdx: number; dayIdx: number } | null>(null);

    const templates = useMemo(() => dataStore.getSessions().filter(s => s.isTemplate), []);
    const allExercises = useMemo(() => dataStore.getExercises(), []);

    function getNextMonday() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() + (day === 0 ? 1 : (8 - day));
        const nextMon = new Date(d);
        nextMon.setDate(diff);
        return nextMon.toISOString().split('T')[0];
    }

    const toggleTrainingDay = (day: number) => {
        setTrainingDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
        );
    };

    const handleGenerateWeeks = () => {
        const generated = generateProgressiveWeeks(totalWeeks, trainingDays.length, trainingDays);
        setWeeks(generated);
        setStep('weeks');
        setExpandedWeek(0);
    };

    const updateWeekTheme = (weekIdx: number, theme: string) =>
        setWeeks(prev => prev.map((w, i) => i === weekIdx ? { ...w, theme } : w));

    const updateDayFocus = (weekIdx: number, dayIdx: number, focus: string) =>
        setWeeks(prev => prev.map((w, i) => {
            if (i !== weekIdx) return w;
            const newDays = [...w.days];
            newDays[dayIdx] = { ...newDays[dayIdx], focus };
            return { ...w, days: newDays };
        }));

    const updateDayIntensity = (weekIdx: number, dayIdx: number, intensity: 'low' | 'medium' | 'high') =>
        setWeeks(prev => prev.map((w, i) => {
            if (i !== weekIdx) return w;
            const newDays = [...w.days];
            newDays[dayIdx] = { ...newDays[dayIdx], intensity };
            return { ...w, days: newDays };
        }));

    const updateDayTemplate = (weekIdx: number, dayIdx: number, templateId: string) =>
        setWeeks(prev => prev.map((w, i) => {
            if (i !== weekIdx) return w;
            const newDays = [...w.days];
            newDays[dayIdx] = { ...newDays[dayIdx], sessionTemplateId: templateId || undefined };
            return { ...w, days: newDays };
        }));

    const addExerciseToDay = (weekIdx: number, dayIdx: number, exerciseId: string) =>
        setWeeks(prev => prev.map((w, i) => {
            if (i !== weekIdx) return w;
            const newDays = [...w.days];
            const existing = newDays[dayIdx].exerciseIds || [];
            if (!existing.includes(exerciseId))
                newDays[dayIdx] = { ...newDays[dayIdx], exerciseIds: [...existing, exerciseId] };
            return { ...w, days: newDays };
        }));

    const removeExerciseFromDay = (weekIdx: number, dayIdx: number, exerciseId: string) =>
        setWeeks(prev => prev.map((w, i) => {
            if (i !== weekIdx) return w;
            const newDays = [...w.days];
            const existing = newDays[dayIdx].exerciseIds || [];
            newDays[dayIdx] = { ...newDays[dayIdx], exerciseIds: existing.filter(id => id !== exerciseId) };
            return { ...w, days: newDays };
        }));

    // Copy week N settings to all other weeks
    const copyWeekToAll = (srcIdx: number) => {
        const src = weeks[srcIdx];
        setWeeks(prev => prev.map((w, i) => {
            if (i === srcIdx) return w;
            return {
                ...w,
                theme: src.theme,
                days: w.days.map((d, dIdx) => ({
                    ...d,
                    focus: src.days[dIdx]?.focus ?? d.focus,
                    intensity: src.days[dIdx]?.intensity ?? d.intensity,
                    sessionTemplateId: src.days[dIdx]?.sessionTemplateId,
                    exerciseIds: src.days[dIdx]?.exerciseIds ? [...(src.days[dIdx].exerciseIds || [])] : d.exerciseIds,
                })),
            };
        }));
    };

    function getDayOffset(startDow: number, targetDow: number): number {
        return ((targetDow - startDow) + 7) % 7;
    }

    const handleSaveProgram = () => {
        const program: TrainingProgram = {
            id: generateId(),
            title: title || `Program ${totalWeeks}w`,
            description,
            totalWeeks,
            daysPerWeek: trainingDays.length,
            trainingDays,
            startDate: new Date(startDate),
            level: level as TrainingProgram['level'],
            focusProgression: weeks.map(w => w.theme),
            weeks,
            assignedTo: assignedTo || undefined,
            isBlueprint: false,
            createdAt: new Date(),
            status: 'draft',
        };
        dataStore.addProgram(program);

        const start = new Date(startDate);
        weeks.forEach((week, wIdx) => {
            week.days.forEach(day => {
                const eventDate = new Date(start);
                eventDate.setDate(start.getDate() + (wIdx * 7) + getDayOffset(start.getDay(), day.dayOfWeek));
                const focusOpt = FOCUS_OPTIONS_KEYS.find(f => f.value === day.focus);
                const focusLabel = focusOpt ? t(focusOpt.labelKey) : day.focus;
                dataStore.addCalendarEvent({
                    id: generateId(),
                    title: `${title || 'Program'} · W${week.weekNumber} · ${focusLabel}`,
                    date: eventDate,
                    time: '09:00',
                    type: 'session',
                    sessionId: day.sessionTemplateId,
                    notes: `Week ${week.weekNumber}: ${week.theme}\nIntensity: ${day.intensity}`,
                    completed: false,
                    sourceId: 'user',
                });
            });
        });

        showSuccess('Program added to calendar!', '/calendar');
    };

    const handleSaveBlueprint = () => {
        const program: TrainingProgram = {
            id: generateId(),
            title: title || `Blueprint ${totalWeeks}w`,
            description,
            totalWeeks,
            daysPerWeek: trainingDays.length,
            trainingDays,
            startDate: new Date(startDate),
            level: level as TrainingProgram['level'],
            focusProgression: weeks.map(w => w.theme),
            weeks,
            isBlueprint: true,
            createdAt: new Date(),
            status: 'draft',
        };
        dataStore.addProgram(program);
        showSuccess('Blueprint saved to your library!', '/playlists');
    };

    const steps: { key: Step; label: string }[] = [
        { key: 'setup', label: 'Set Up' },
        { key: 'weeks', label: 'Weeks' },
        { key: 'review', label: 'Review' },
    ];

    const canProceedFromSetup = title.trim().length > 0 && trainingDays.length > 0;

    const totalSessions = totalWeeks * trainingDays.length;
    const endDate = (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (totalWeeks * 7) - 1);
        return d;
    })();

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-lg transition">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                        Program Builder
                    </h1>
                    <p className="text-sm text-slate-400">Design multi-week training blocks</p>
                </div>
            </div>

            {/* Step Navigator — 3 steps */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1.5 border border-slate-700/50">
                {steps.map((s, i) => (
                    <button
                        key={s.key}
                        onClick={() => {
                            if (s.key === 'setup') setStep('setup');
                            else if (s.key === 'weeks' && weeks.length > 0) setStep('weeks');
                            else if (s.key === 'review' && weeks.length > 0) setStep('review');
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                            step === s.key
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <span className="hidden sm:inline">{s.label}</span>
                    </button>
                ))}
            </div>

            {/* ── STEP 1: SET UP (config + schedule merged) ─────────────────── */}
            {step === 'setup' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* Program Info */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            Program Info
                        </h2>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Pre-Season Baseline Builder"
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition text-base font-medium"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={assignedTo}
                                onChange={e => setAssignedTo(e.target.value)}
                                placeholder="Assign to player (optional)"
                                className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition text-sm"
                            />
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Notes (optional)"
                                rows={1}
                                className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Duration, Days/Week, Level — single card */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            Block Duration
                        </h2>
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Total Weeks</label>
                            <div className="flex gap-2">
                                {[4, 6, 8, 10, 12].map(w => (
                                    <button key={w} onClick={() => setTotalWeeks(w)}
                                        className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border",
                                            totalWeeks === w
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                                : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70"
                                        )}>
                                        {w}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Level</label>
                            <div className="flex gap-2">
                                {LEVEL_OPTIONS_KEYS.map(opt => (
                                    <button key={opt.value} onClick={() => setLevel(opt.value)}
                                        className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                                            level === opt.value ? opt.color : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70"
                                        )}>
                                        {t(opt.labelKey)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="flex gap-4 pt-2 border-t border-slate-700/50">
                            <div className="text-center">
                                <div className="text-xl font-bold text-emerald-400">{totalSessions}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Sessions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-blue-400">{totalWeeks}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Weeks</div>
                            </div>
                            <div className="text-center flex-1 text-right">
                                <div className="text-sm font-bold text-slate-300">
                                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                                    {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Program window</div>
                            </div>
                        </div>
                    </div>

                    {/* Training Days + Start Date — same card */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            Schedule
                        </h2>
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Training Days
                                <span className="ml-2 text-slate-600">— {trainingDays.length} selected</span>
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                                {DAY_NAMES_KEYS.map((nameKey, i) => (
                                    <button key={i} onClick={() => toggleTrainingDay(i)}
                                        className={cn("py-3 rounded-xl text-sm font-bold transition-all border text-center",
                                            trainingDays.includes(i)
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                                : "bg-slate-700/30 text-slate-500 border-slate-600/30 hover:bg-slate-700/60 hover:text-slate-300"
                                        )}>
                                        <div className="text-xs opacity-70 mb-0.5">{t(nameKey)}</div>
                                        {trainingDays.includes(i) && <div className="w-1 h-1 bg-emerald-400 rounded-full mx-auto mt-1" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition text-sm"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateWeeks}
                        disabled={!canProceedFromSetup}
                        className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                            canProceedFromSetup
                                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/20"
                                : "bg-slate-700/40 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate {totalWeeks}-Week Plan
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── STEP 2: WEEKS ─────────────────────────────────────────────── */}
            {step === 'weeks' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">{weeks.length}-Week Plan</h2>
                        <div className="text-sm text-slate-400">{totalSessions} sessions total</div>
                    </div>


                    {/* Week Cards */}
                    <div className="space-y-3">
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} className={cn(
                                "border rounded-2xl overflow-hidden transition-all",
                                expandedWeek === wIdx
                                    ? "bg-slate-800/70 border-emerald-500/30"
                                    : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                            )}>
                                {/* Week Header */}
                                <button
                                    onClick={() => setExpandedWeek(expandedWeek === wIdx ? null : wIdx)}
                                    className="w-full px-5 py-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                                            {week.weekNumber}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-white font-semibold text-sm">Week {week.weekNumber}</div>
                                            <div className="text-slate-500 text-xs flex items-center gap-2">
                                                {week.days.map((d, dIdx) => (
                                                    <span key={dIdx} className={cn(
                                                        "w-1.5 h-1.5 rounded-full inline-block",
                                                        d.intensity === 'high' ? 'bg-red-400' : d.intensity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                                    )} />
                                                ))}
                                                {week.days.length} sessions
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Copy to All */}
                                        <button
                                            onClick={e => { e.stopPropagation(); copyWeekToAll(wIdx); }}
                                            title="Copy this week's settings to all other weeks"
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", expandedWeek === wIdx && "rotate-180")} />
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {expandedWeek === wIdx && (
                                    <div className="px-5 pb-5 space-y-4 border-t border-slate-700/50 pt-4">
                                        {/* Theme selector */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Week Theme</label>
                                            <select
                                                value={week.theme}
                                                onChange={e => updateWeekTheme(wIdx, e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                            >
                                                {WEEK_THEME_KEYS.map(tk => (
                                                    <option key={tk} value={tk}>{t(tk)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Day Cards */}
                                        <div className="space-y-2">
                                            {week.days.map((day, dIdx) => (
                                                <div key={dIdx} className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-white font-medium text-sm flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {t(DAY_NAMES_FULL_KEYS[day.dayOfWeek])}
                                                        </div>
                                                        {/* Intensity */}
                                                        <div className="flex gap-1">
                                                            {(['low', 'medium', 'high'] as const).map(int => (
                                                                <button key={int} onClick={() => updateDayIntensity(wIdx, dIdx, int)}
                                                                    className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border",
                                                                        day.intensity === int
                                                                            ? int === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                                                : int === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                                                                                    : 'bg-green-500/20 text-green-400 border-green-500/40'
                                                                            : 'bg-slate-700/40 text-slate-500 border-transparent'
                                                                    )}>
                                                                    {int === 'low' ? t('intensity.low') : int === 'medium' ? t('intensity.medium') : t('intensity.high')}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Focus */}
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {FOCUS_OPTIONS_KEYS.map(opt => (
                                                            <button key={opt.value} onClick={() => updateDayFocus(wIdx, dIdx, opt.value)}
                                                                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1",
                                                                    day.focus === opt.value ? opt.color : "bg-slate-700/40 text-slate-500 border-transparent hover:bg-slate-700/60"
                                                                )}>
                                                                <span>{opt.icon}</span>
                                                                {t(opt.labelKey)}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Template selector */}
                                                    {templates.length > 0 && (
                                                        <select
                                                            value={day.sessionTemplateId || ''}
                                                            onChange={e => updateDayTemplate(wIdx, dIdx, e.target.value)}
                                                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-500 mb-2"
                                                        >
                                                            <option value="">No linked template</option>
                                                            {templates.map(tmpl => (
                                                                <option key={tmpl.id} value={tmpl.id}>{tmpl.title}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* Exercises */}
                                                    {(day.exerciseIds && day.exerciseIds.length > 0) && (
                                                        <div className="mt-2 space-y-1.5">
                                                            <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                                <Dumbbell className="w-3 h-3" />
                                                                {day.exerciseIds.length} exercises
                                                            </div>
                                                            {day.exerciseIds.map((exId, exIdx) => {
                                                                const ex = allExercises.find(e => e.id === exId);
                                                                if (!ex) return null;
                                                                return (
                                                                    <div key={exId} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2 group">
                                                                        <span className="text-[10px] text-slate-600 font-bold w-4">{exIdx + 1}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs text-white font-medium truncate">{ex.title}</div>
                                                                        </div>
                                                                        <button onClick={() => removeExerciseFromDay(wIdx, dIdx, exId)}
                                                                            className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition">
                                                                            <X className="w-3 h-3 text-red-400" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setExercisePickerOpen({ weekIdx: wIdx, dayIdx: dIdx })}
                                                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600/60 text-xs text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add exercises from library
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep('setup')}
                            className="flex-1 py-3 rounded-xl bg-slate-700/50 text-slate-300 font-medium hover:bg-slate-700 transition flex items-center justify-center gap-2">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <button onClick={() => setStep('review')}
                            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                            Review Program
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: REVIEW ────────────────────────────────────────────── */}
            {step === 'review' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/5 border border-emerald-500/20 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-1">{title || 'Untitled Program'}</h2>
                        {description && <p className="text-slate-400 text-sm mb-3">{description}</p>}
                        {assignedTo && (
                            <div className="text-sm text-slate-300 flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-blue-400" />
                                Assigned to <span className="font-medium">{assignedTo}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-4 gap-3 mt-4">
                            {[
                                { label: 'Weeks', value: totalWeeks, color: 'text-emerald-400' },
                                { label: 'Sessions', value: totalSessions, color: 'text-blue-400' },
                                { label: 'Level', value: t(LEVEL_OPTIONS_KEYS.find(l => l.value === level)?.labelKey || ''), color: 'text-purple-400' },
                                { label: 'Days', value: trainingDays.map(d => t(DAY_NAMES_KEYS[d])).join(', '), color: 'text-yellow-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                                    <div className={cn("text-xl font-bold", color)}>{value}</div>
                                    <div className="text-xs text-slate-400">{label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="text-sm text-slate-400 mt-3">
                            {new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                            {' → '}
                            {endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Week overview */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Weekly Progression</h3>
                        <div className="space-y-2">
                            {weeks.map((w, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                                        {w.weekNumber}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm text-white font-medium">{t(w.theme)}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        {w.days.map((d, dIdx) => {
                                            const fo = FOCUS_OPTIONS_KEYS.find(f => f.value === d.focus);
                                            return <span key={dIdx} className="text-sm" title={fo ? t(fo.labelKey) : ''}>{fo?.icon}</span>;
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTAs — Blueprint is PRIMARY */}
                    <div className="space-y-3">
                        {/* PRIMARY: Save as Blueprint */}
                        <button
                            onClick={handleSaveBlueprint}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 text-base"
                        >
                            <BookMarked className="w-5 h-5" />
                            Save as Blueprint
                        </button>
                        <p className="text-center text-[11px] text-slate-500">Saves to your library — apply to any player's calendar later</p>

                        {/* SECONDARY: Add to Calendar */}
                        <button
                            onClick={handleSaveProgram}
                            className="w-full py-3 rounded-xl border border-slate-600 bg-slate-800/40 text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-500 transition flex items-center justify-center gap-2 text-sm"
                        >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Add to Calendar Now
                        </button>

                        <button onClick={() => setStep('weeks')}
                            className="w-full py-2.5 rounded-xl text-slate-500 text-sm hover:text-slate-300 transition flex items-center justify-center gap-2">
                            <ChevronLeft className="w-4 h-4" /> Edit Weeks
                        </button>
                    </div>
                </div>
            )}

            {/* Exercise Picker Modal */}
            {exercisePickerOpen && (
                <ExercisePickerModal
                    exercises={allExercises}
                    selectedIds={weeks[exercisePickerOpen.weekIdx]?.days[exercisePickerOpen.dayIdx]?.exerciseIds || []}
                    dayLabel={t(DAY_NAMES_FULL_KEYS[weeks[exercisePickerOpen.weekIdx]?.days[exercisePickerOpen.dayIdx]?.dayOfWeek ?? 0])}
                    weekNumber={weeks[exercisePickerOpen.weekIdx]?.weekNumber ?? 1}
                    onAdd={(exId) => addExerciseToDay(exercisePickerOpen.weekIdx, exercisePickerOpen.dayIdx, exId)}
                    onRemove={(exId) => removeExerciseFromDay(exercisePickerOpen.weekIdx, exercisePickerOpen.dayIdx, exId)}
                    onClose={() => setExercisePickerOpen(null)}
                />
            )}
        </div>
    );
}

// ─── Exercise Picker Modal ────────────────────────────────────────────────────

function ExercisePickerModal({ exercises, selectedIds, dayLabel, weekNumber, onAdd, onRemove, onClose }: {
    exercises: Exercise[];
    selectedIds: string[];
    dayLabel: string;
    weekNumber: number;
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const CATEGORY_COLORS: Record<string, string> = {
        basket: 'bg-purple-500/20 text-purple-400',
        drill: 'bg-blue-500/20 text-blue-400',
        points: 'bg-yellow-500/20 text-yellow-400',
        game: 'bg-green-500/20 text-green-400',
    };

    const filtered = exercises.filter(ex => {
        if (search && !ex.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-emerald-400" />
                                Add Exercises
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Week {weekNumber} · {dayLabel} · {selectedIds.length} selected
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search exercises..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                            autoFocus />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {['all', 'basket', 'drill', 'points', 'game'].map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)}
                                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border capitalize",
                                    categoryFilter === cat
                                        ? cat === 'all' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : (CATEGORY_COLORS[cat] || '') + ' border-current'
                                        : "bg-slate-700/40 text-slate-500 border-transparent hover:bg-slate-700"
                                )}>
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No exercises found</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filtered.map(ex => {
                                const isSelected = selectedIds.includes(ex.id);
                                return (
                                    <div key={ex.id}
                                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                                            isSelected ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-slate-700/40 border border-transparent"
                                        )}
                                        onClick={() => isSelected ? onRemove(ex.id) : onAdd(ex.id)}>
                                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                            isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-600 group-hover:border-slate-400")}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white font-medium truncate">{ex.title}</div>
                                            <div className="text-xs text-slate-500 truncate">{ex.description?.substring(0, 60)}</div>
                                        </div>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize font-medium",
                                            CATEGORY_COLORS[ex.category] || 'bg-slate-700 text-slate-400')}>
                                            {ex.category}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-700 flex-shrink-0 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        <span className="text-emerald-400 font-bold">{selectedIds.length}</span> exercises selected
                    </div>
                    <button onClick={onClose}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-all">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
