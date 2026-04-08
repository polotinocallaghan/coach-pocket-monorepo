'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataStore, Exercise, Session, SessionExercise } from '@coach-pocket/core';
import { Zap, Users, LayoutGrid, Signal, Target, ChevronDown, Shuffle, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

type FocusOption = 'forehand' | 'backhand' | 'serve' | 'volley' | 'consistency' | 'footwork';
type FilterKey = 'players' | 'courts' | 'level' | 'focus';

const LEVEL_OPTIONS = [
    { value: 'beginner', labelKey: 'level.beginner', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { value: 'intermediate', labelKey: 'level.intermediate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'advanced', labelKey: 'level.advanced', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 'pro', labelKey: 'level.pro', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
] as const;

const FOCUS_OPTIONS: { value: FocusOption; labelKey: string; icon: string }[] = [
    { value: 'forehand', labelKey: 'focus.forehand', icon: '💪' },
    { value: 'backhand', labelKey: 'focus.backhand', icon: '🔄' },
    { value: 'serve', labelKey: 'focus.serve', icon: '🎯' },
    { value: 'volley', labelKey: 'focus.volley', icon: '⚡' },
    { value: 'consistency', labelKey: 'focus.consistency', icon: '🔁' },
    { value: 'footwork', labelKey: 'focus.footwork', icon: '👟' },
];

const PLAYER_OPTIONS = [1, 2, 3, 4, 6, 8];
const COURT_OPTIONS = [1, 2, 3, 4];

// Map exercises to session blocks based on category
function getBlockForExercise(exercise: Exercise, index: number, total: number): SessionExercise['block'] {
    if (index === 0) return 'warm-up';
    if (index === total - 1 && total > 2) return 'competitive';
    if (exercise.category === 'game') return 'competitive';
    if (exercise.category === 'basket') return 'technical';
    if (exercise.drillType === 'points') return 'situational';
    return 'technical';
}

export default function QuickSessionGenerator() {
    const router = useRouter();
    const { t } = useLanguage();
    const [expandedFilter, setExpandedFilter] = useState<FilterKey | null>(null);
    const [playerCount, setPlayerCount] = useState<number | null>(null);
    const [courtCount, setCourtCount] = useState<number | null>(null);
    const [level, setLevel] = useState<string | null>(null);
    const [focusAreas, setFocusAreas] = useState<FocusOption[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSession, setGeneratedSession] = useState<Session | null>(null);

    const toggleFilter = (key: FilterKey) => {
        setExpandedFilter(prev => prev === key ? null : key);
    };

    const toggleFocus = (focus: FocusOption) => {
        setFocusAreas(prev =>
            prev.includes(focus)
                ? prev.filter(f => f !== focus)
                : [...prev, focus]
        );
    };

    const allFiltersSelected = playerCount !== null && courtCount !== null && level !== null && focusAreas.length > 0;

    // Get summary text for each filter
    const getPlayerSummary = () => playerCount !== null ? `${playerCount}` : null;
    const getCourtSummary = () => courtCount !== null ? `${courtCount}` : null;
    const getLevelSummary = () => {
        if (!level) return null;
        return LEVEL_OPTIONS.find(l => l.value === level)?.labelKey ? t(LEVEL_OPTIONS.find(l => l.value === level)!.labelKey) : null;
    };
    const getFocusSummary = () => {
        if (focusAreas.length === 0) return null;
        return focusAreas.map(f => { const opt = FOCUS_OPTIONS.find(o => o.value === f); return opt ? t(opt.labelKey) : f; }).join(', ');
    };

    const generateSession = () => {
        if (!allFiltersSelected) return;

        setIsGenerating(true);

        setTimeout(() => {
            const exercises = dataStore.getExercises();

            let filtered = exercises.filter(ex => {
                if (playerCount! < ex.playerCount) return false;
                if (ex.courtsNeeded > courtCount!) return false;

                const levelOrder = ['beginner', 'intermediate', 'advanced', 'pro'];
                const exLevelIdx = levelOrder.indexOf(ex.level);
                const selectedLevelIdx = levelOrder.indexOf(level!);
                if (Math.abs(exLevelIdx - selectedLevelIdx) > 1) return false;

                return true;
            });

            const scored = filtered.map(ex => {
                let score = 0;
                focusAreas.forEach(focus => {
                    if (ex.focusAreas.includes(focus)) score += 3;
                });
                if (ex.level === level) score += 2;
                score += ex.rating;
                score += Math.min(ex.timesUsed / 20, 2);
                return { exercise: ex, score };
            });

            scored.sort((a, b) => b.score - a.score);

            let selectedExercises: Exercise[];
            if (scored.length >= 4) {
                const top = scored.slice(0, Math.min(8, scored.length));
                const shuffled = top.sort(() => Math.random() - 0.5);
                selectedExercises = shuffled.slice(0, Math.min(6, shuffled.length)).map(s => s.exercise);
            } else if (scored.length > 0) {
                selectedExercises = scored.map(s => s.exercise);
            } else {
                selectedExercises = exercises.slice(0, 4);
            }

            const categoryOrder: Record<string, number> = { 'basket': 0, 'drill': 1, 'points': 2, 'game': 3 };
            selectedExercises.sort((a, b) => (categoryOrder[a.category] ?? 1) - (categoryOrder[b.category] ?? 1));

            const sessionId = `quick-${Date.now()}`;
            const sessionExercises: SessionExercise[] = selectedExercises.map((ex, idx) => ({
                id: `se-${idx}`,
                exerciseId: ex.id,
                block: getBlockForExercise(ex, idx, selectedExercises.length),
                order: idx,
                duration: ex.duration || 10,
            }));

            const focusLabel = focusAreas.map(f => {
                const opt = FOCUS_OPTIONS.find(o => o.value === f);
                return opt ? t(opt.labelKey) : f;
            }).join(' + ');

            const newSession: Session = {
                id: sessionId,
                title: t('qs.quickSessionTitle', { focus: focusLabel }),
                description: t('qs.autoGenerated', { players: String(playerCount), courts: String(courtCount), level: t(LEVEL_OPTIONS.find(l => l.value === level)!.labelKey) }),
                type: 'practice',
                isTemplate: false,
                exercises: sessionExercises,
                createdAt: new Date(),
                status: 'draft',
            };

            dataStore.addSession(newSession);
            setGeneratedSession(newSession);
            setIsGenerating(false);
        }, 800);
    };

    const goToSession = () => {
        if (generatedSession) {
            router.push(`/session/${generatedSession.id}`);
        }
    };

    const resetGenerator = () => {
        setPlayerCount(null);
        setCourtCount(null);
        setLevel(null);
        setFocusAreas([]);
        setGeneratedSession(null);
        setIsGenerating(false);
        setExpandedFilter(null);
    };

    // Generated session view
    if (generatedSession) {
        const exercises = dataStore.getExercises();
        const sessionExercises = generatedSession.exercises.map(se => {
            const ex = exercises.find(e => e.id === se.exerciseId);
            return { ...se, title: ex?.title || '?', category: ex?.category || 'drill', dur: se.duration || ex?.duration || 10 };
        });
        const totalDuration = sessionExercises.reduce((sum, e) => sum + e.dur, 0);

        return (
            <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
                {/* Success Header */}
                <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold">{t('qs.sessionGenerated')}</h3>
                        <p className="text-slate-400 text-xs">{sessionExercises.length} {t('pb.exercises').toLowerCase()} · {totalDuration} min</p>
                    </div>
                </div>

                {/* Exercises Preview */}
                <div className="px-5 pb-3">
                    <div className="space-y-1.5">
                        {sessionExercises.map((ex, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500 text-xs w-4 text-right">{idx + 1}.</span>
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    ex.category === 'drill' && "bg-blue-400",
                                    ex.category === 'game' && "bg-green-400",
                                    ex.category === 'basket' && "bg-purple-400",
                                    ex.category === 'points' && "bg-yellow-400",
                                )} />
                                <span className="text-slate-300 truncate flex-1">{ex.title}</span>
                                <span className="text-slate-500 text-xs">{ex.dur}m</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                    <button
                        onClick={goToSession}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        {t('qs.openSession')}
                    </button>
                    <button
                        onClick={resetGenerator}
                        className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2"
                    >
                        <Shuffle className="w-4 h-4" />
                        {t('qs.another')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-base">{t('qs.quickSession')}</h3>
                    <p className="text-slate-500 text-xs">{t('qs.selectFilters')}</p>
                </div>
            </div>

            {/* Filters as collapsible rows */}
            <div className="px-5 pb-2 space-y-1">
                {/* Filter: Player Count */}
                <FilterRow
                    label={t('qs.players')}
                    icon={<Users className="w-3.5 h-3.5" />}
                    isExpanded={expandedFilter === 'players'}
                    onToggle={() => toggleFilter('players')}
                    summary={getPlayerSummary()}
                    hasValue={playerCount !== null}
                >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                        {PLAYER_OPTIONS.map(num => (
                            <button
                                key={num}
                                onClick={() => setPlayerCount(playerCount === num ? null : num)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                                    playerCount === num
                                        ? "bg-green-500/20 text-green-400 border-green-500/40 shadow-sm shadow-green-500/20"
                                        : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70 hover:text-slate-300"
                                )}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </FilterRow>

                {/* Filter: Court Count */}
                <FilterRow
                    label={t('qs.courts')}
                    icon={<LayoutGrid className="w-3.5 h-3.5" />}
                    isExpanded={expandedFilter === 'courts'}
                    onToggle={() => toggleFilter('courts')}
                    summary={getCourtSummary()}
                    hasValue={courtCount !== null}
                >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                        {COURT_OPTIONS.map(num => (
                            <button
                                key={num}
                                onClick={() => setCourtCount(courtCount === num ? null : num)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                                    courtCount === num
                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/20"
                                        : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70 hover:text-slate-300"
                                )}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </FilterRow>

                {/* Filter: Level */}
                <FilterRow
                    label={t('qs.level')}
                    icon={<Signal className="w-3.5 h-3.5" />}
                    isExpanded={expandedFilter === 'level'}
                    onToggle={() => toggleFilter('level')}
                    summary={getLevelSummary()}
                    hasValue={level !== null}
                >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                        {LEVEL_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setLevel(level === opt.value ? null : opt.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                                    level === opt.value
                                        ? opt.color
                                        : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70 hover:text-slate-300"
                                )}
                            >
                                {opt.labelKey ? t(opt.labelKey) : ''}
                            </button>
                        ))}
                    </div>
                </FilterRow>

                {/* Filter: Focus Areas */}
                <FilterRow
                    label={t('qs.trainingFocus')}
                    icon={<Target className="w-3.5 h-3.5" />}
                    isExpanded={expandedFilter === 'focus'}
                    onToggle={() => toggleFilter('focus')}
                    summary={getFocusSummary()}
                    hasValue={focusAreas.length > 0}
                >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                        {FOCUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleFocus(opt.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-1.5",
                                    focusAreas.includes(opt.value)
                                        ? "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-sm shadow-purple-500/20"
                                        : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70 hover:text-slate-300"
                                )}
                            >
                                <span className="text-xs">{opt.icon}</span>
                                {t(opt.labelKey)}
                            </button>
                        ))}
                    </div>
                </FilterRow>
            </div>

            {/* Generate Button */}
            <div className="px-5 pt-2 pb-5">
                <button
                    onClick={generateSession}
                    disabled={!allFiltersSelected || isGenerating}
                    className={cn(
                        "w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2",
                        allFiltersSelected && !isGenerating
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-slate-700/40 text-slate-500 cursor-not-allowed"
                    )}
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('qs.generating')}
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            {t('qs.generateSession')}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Collapsible filter row component
function FilterRow({
    label,
    icon,
    isExpanded,
    onToggle,
    summary,
    hasValue,
    children,
}: {
    label: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    summary: string | null;
    hasValue: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={cn(
            "rounded-xl border transition-all duration-200",
            isExpanded
                ? "bg-slate-800/60 border-slate-600/50"
                : hasValue
                    ? "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50"
                    : "bg-slate-800/20 border-slate-700/30 hover:bg-slate-800/40"
        )}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 group"
            >
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "transition-colors",
                        hasValue ? "text-green-400" : "text-slate-500"
                    )}>
                        {icon}
                    </span>
                    <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider transition-colors",
                        hasValue ? "text-slate-300" : "text-slate-500"
                    )}>
                        {label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {summary && !isExpanded && (
                        <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">
                            {summary}
                        </span>
                    )}
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-500 transition-transform duration-200",
                        isExpanded && "rotate-180"
                    )} />
                </div>
            </button>
            <div className={cn(
                "overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-40 opacity-100 px-3.5 pb-2.5" : "max-h-0 opacity-0"
            )}>
                {children}
            </div>
        </div>
    );
}
