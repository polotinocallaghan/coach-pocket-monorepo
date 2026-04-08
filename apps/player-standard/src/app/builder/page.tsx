'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataStore, Exercise, Session, SessionExercise, CalendarSource, CalendarEvent } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { cn, generateId } from '@/lib/utils';
import { getRecommendedDrills } from '@/lib/drill-recommender';
import { useSuccess } from '@/lib/SuccessContext';
import { Search, ArrowLeft, Check, Save, Clock, Filter, ChevronDown, Star, X, BookMarked, ChevronLeft, ChevronRight, Target, Users, School, Repeat, Lightbulb, Zap, Printer, Plus, Minus } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, format, addMonths, subMonths, getDay, setDay, addWeeks } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SessionPDFTemplate } from '@coach-pocket/shared';
import { TrainingPreferencesViewer } from '@/components/features/profile/TrainingPreferences';

export default function SessionBuilderPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading builder...</div>}>
            <SessionBuilderContent />
        </Suspense>
    );
}

function SessionBuilderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showSuccess } = useSuccess();
    const exercises = useDataStore(() => dataStore.getExercises());
    const calendarSources = useDataStore(() => dataStore.getCalendarSources());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExercises, setSelectedExercises] = useState<{ exerciseId: string; instanceId: string; duration: number }[]>([]);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Session metadata - collected first
    const [sessionDate, setSessionDate] = useState('');
    const [sessionTime, setSessionTime] = useState('');
    const [sessionTitle, setSessionTitle] = useState('');
    const [sessionType, setSessionType] = useState<'practice' | 'match' | 'match-prep'>('practice');
    const [showDateModal, setShowDateModal] = useState(true);
    const [sessionConfigured, setSessionConfigured] = useState(false);
    const [sessionSourceId, setSessionSourceId] = useState<string | null>(null);
    const [sessionCourt, setSessionCourt] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Recurrence modal state
    const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
    const [pendingSession, setPendingSession] = useState<Session | null>(null);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        const typeParam = searchParams.get('type');
        const sessionIdParam = searchParams.get('sessionId');
        const sourceIdParam = searchParams.get('sourceId');
        const courtParam = searchParams.get('court');

        // Priority 1: Edit Existing Session (sessionId)
        if (sessionIdParam) {
            const existingSession = dataStore.getSessions().find(s => s.id === sessionIdParam);
            if (existingSession) {
                setSessionTitle(existingSession.title);
                setSessionType(existingSession.type as any);
                // Map SessionExercise[] to { exerciseId, instanceId, duration }[]
                // Preserve saved duration, fall back to exercise library default
                const allExercises = dataStore.getExercises();
                const minimalExercises = existingSession.exercises.map(e => {
                    const libExercise = allExercises.find(ex => ex.id === e.exerciseId);
                    return {
                        exerciseId: e.exerciseId,
                        instanceId: e.id,
                        duration: e.duration || libExercise?.duration || 10
                    };
                });
                setSelectedExercises(minimalExercises);
                setSessionDate(existingSession.createdAt ? existingSession.createdAt.toISOString().split('T')[0] : '');

                setSessionConfigured(true);
                setShowDateModal(false);
                return;
            }
        }

        // Priority 2: URL Parameters (Calendar/New Session Flow)
        if (dateParam && showDateModal) {
            setSessionDate(dateParam);
            if (sourceIdParam) {
                setSessionSourceId(sourceIdParam);
            }
            if (courtParam) {
                setSessionCourt(courtParam);
            }

            if (typeParam) {
                setSessionType(typeParam as any);
                const date = new Date(dateParam + 'T12:00:00');
                const formatted = format(date, 'MMM d');

                // Determine title based on source availability
                if (sourceIdParam) {
                    const source = dataStore.getCalendarSources().find(s => s.id === sourceIdParam);
                    if (source) {
                        setSessionTitle(`${typeParam === 'match' ? 'Match' : 'Practice'} - ${source.name}`);
                    } else {
                        setSessionTitle(`${typeParam === 'match' ? 'Match' : 'Practice'} - ${formatted}`);
                    }
                } else {
                    setSessionTitle(`${typeParam === 'match' ? 'Match' : 'Practice'} - ${formatted}`);
                }
            }
            setSessionConfigured(true);
            setShowDateModal(false);
            return;
        }

        // Priority 3: Restore Draft from localStorage (if no URL params and not configured)
        if (!sessionConfigured && !dateParam && !sessionIdParam) {
            const savedDraft = localStorage.getItem('builder_draft');
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    setSessionTitle(draft.title);
                    setSessionDate(draft.date);
                    setSessionTime(draft.time);
                    setSessionType(draft.type);
                    setSelectedExercises(draft.exercises);
                    setSessionSourceId(draft.sourceId);
                    setSessionCourt(draft.court || '');
                    setSessionConfigured(draft.isConfigured);
                    setShowDateModal(!draft.isConfigured);
                } catch (e) {
                    console.error('Failed to restore draft', e);
                }
            }
        }
    }, [searchParams, sessionConfigured, showDateModal]);

    // Save Draft to localStorage
    useEffect(() => {
        // Only save if we have some meaningful state
        if (sessionConfigured || selectedExercises.length > 0 || sessionTitle) {
            const draft = {
                title: sessionTitle,
                date: sessionDate,
                time: sessionTime,
                type: sessionType,
                exercises: selectedExercises,
                sourceId: sessionSourceId,
                court: sessionCourt,
                isConfigured: sessionConfigured
            };
            localStorage.setItem('builder_draft', JSON.stringify(draft));
        }
    }, [sessionTitle, sessionDate, sessionTime, sessionType, selectedExercises, sessionSourceId, sessionCourt, sessionConfigured]);

    // Comprehensive filter state
    const [filters, setFilters] = useState({
        drillType: 'all' as string,
        level: 'all' as string,
        ageGroup: 'all' as string,
        needsCoach: 'all' as string,
        playerCount: [1, 10] as [number, number],
        ballsNeeded: 'all' as string,
        focusAreas: [] as string[],
        minRating: 0,
        sortBy: 'recent' as string,
        playMode: 'all' as string,
    });

    const filteredExercises = exercises.filter(exercise => {
        // Text search
        if (searchTerm) {
            const matchesSearch = exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
        }

        // Dropdown filters
        if (filters.drillType !== 'all' && exercise.drillType !== filters.drillType) return false;
        if (filters.level !== 'all' && exercise.level !== filters.level) return false;
        if (filters.ageGroup !== 'all' && exercise.ageGroup !== filters.ageGroup) return false;

        // Boolean filter
        if (filters.needsCoach !== 'all') {
            const needsCoach = filters.needsCoach === 'yes';
            if (exercise.needsCoach !== needsCoach) return false;
        }

        // Range filters
        if (exercise.playerCount < filters.playerCount[0] || exercise.playerCount > filters.playerCount[1]) return false;

        // Multi-select filters
        if (filters.focusAreas.length > 0 && !filters.focusAreas.some(f => exercise.focusAreas.includes(f as any))) return false;
        if (filters.ballsNeeded !== 'all' && exercise.ballsNeeded !== filters.ballsNeeded) return false;

        // Play mode filter
        if (filters.playMode !== 'all') {
            if (exercise.playMode !== filters.playMode && exercise.playMode !== 'both') return false;
        }

        // Rating filter
        if (exercise.rating < filters.minRating) return false;

        return true;
    }).sort((a, b) => {
        if (filters.sortBy === 'most-used') return b.timesUsed - a.timesUsed;
        if (filters.sortBy === 'highest-rated') return b.rating - a.rating;
        if (filters.sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        return 0;
    });

    const toggleFocusArea = (area: string) => {
        setFilters(prev => ({
            ...prev,
            focusAreas: prev.focusAreas.includes(area)
                ? prev.focusAreas.filter(f => f !== area)
                : [...prev.focusAreas, area]
        }));
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setFilters({
            drillType: 'all',
            level: 'all',
            ageGroup: 'all',
            needsCoach: 'all',
            playerCount: [1, 10],
            ballsNeeded: 'all',
            focusAreas: [],
            minRating: 0,
            sortBy: 'recent',
            playMode: 'all',
        });
    };

    const hasActiveFilters = searchTerm || filters.drillType !== 'all' || filters.level !== 'all' ||
        filters.ageGroup !== 'all' || filters.needsCoach !== 'all' || filters.ballsNeeded !== 'all' ||
        filters.focusAreas.length > 0 || filters.minRating > 0 || filters.sortBy !== 'recent' ||
        filters.playMode !== 'all';

    const toggleExerciseSelection = (exerciseId: string) => {
        const exercise = exercises.find(e => e.id === exerciseId);
        // Always add - allow multiple instances of same exercise
        setSelectedExercises([...selectedExercises, { 
            exerciseId, 
            instanceId: generateId(),
            duration: exercise?.duration || 10
        }]);
    };

    const updateExerciseDuration = (instanceId: string, delta: number) => {
        setSelectedExercises(prev => prev.map(item => 
            item.instanceId === instanceId 
                ? { ...item, duration: Math.max(5, (item.duration || 10) + delta) }
                : item
        ));
    };

    const setExerciseDuration = (instanceId: string, value: number) => {
        setSelectedExercises(prev => prev.map(item => 
            item.instanceId === instanceId 
                ? { ...item, duration: Math.max(5, Math.min(120, value)) }
                : item
        ));
    };

    const removeExerciseInstance = (instanceId: string) => {
        setSelectedExercises(selectedExercises.filter(item => item.instanceId !== instanceId));
    };

    const getExerciseCount = (exerciseId: string) => {
        return selectedExercises.filter(item => item.exerciseId === exerciseId).length;
    };

    const handleConfigureSession = (title: string, type: 'practice' | 'match' | 'match-prep', date: string, time: string, sourceId?: string) => {
        setSessionTitle(title);
        setSessionType(type);
        setSessionDate(date);
        setSessionTime(time);
        if (sourceId) setSessionSourceId(sourceId);
        setSessionConfigured(true);
        setShowDateModal(false);
    };

    const handleSaveSession = () => {
        if (!sessionTitle) return;

        const sessionIdParam = searchParams.get('sessionId');

        // Convert selected exercises to SessionExercise format
        // We'll map them, defaulting to 'technical' block and 10min duration
        // unless we load better defaults later (not in this scope)
        const sessionExercises: SessionExercise[] = selectedExercises.map((item, index) => ({
            id: generateId(), // Create new session-exercise instance ID
            exerciseId: item.exerciseId,
            block: 'technical',
            order: index,
            duration: item.duration,
        }));

        if (sessionIdParam) {
            // EDIT EXISTING SESSION
            const existingSession = dataStore.getSessions().find(s => s.id === sessionIdParam);
            if (existingSession) {
                const updatedSession: Session = {
                    ...existingSession,
                    title: sessionTitle,
                    type: sessionType,
                    exercises: sessionExercises,
                    sourceId: sessionSourceId || undefined,
                    // Preserve createdAt? Or update it? Usually preserve.
                };
                // "Update" by replacing in store
                dataStore.deleteSession(sessionIdParam);
                dataStore.addSession(updatedSession);
            } else {
                // Session not found (deleted?), create new but warn? or just create new
                // Fallback to create new
                const newSession: Session = {
                    id: generateId(),
                    title: sessionTitle,
                    description: `Created on ${new Date().toLocaleDateString()}`,
                    type: sessionType,
                    isTemplate: false,
                    exercises: sessionExercises,
                    sourceId: sessionSourceId || undefined,
                    createdAt: new Date(sessionDate || new Date())
                };
                dataStore.addSession(newSession);
            }
        } else {
            // CREATE NEW SESSION
            const newSession: Session = {
                id: generateId(),
                title: sessionTitle,
                description: `Created on ${new Date().toLocaleDateString()}`,
                type: sessionType,
                isTemplate: false,
                exercises: sessionExercises,
                sourceId: sessionSourceId || undefined,
                createdAt: new Date(sessionDate || new Date())
            };
            dataStore.addSession(newSession);

            // If session has a date, show recurrence prompt before creating calendar events
            if (sessionDate) {
                setPendingSession(newSession);
                setShowRecurrenceModal(true);
                return; // Don't finalize yet — RecurrenceModal handles the rest
            }
        }

        // Cleanup
        localStorage.removeItem('builder_draft');
        setSessionConfigured(false);
        setSelectedExercises([]);
        setShowPreviewModal(false); // Ensure closed

        showSuccess('Session saved successfully!', '/calendar');
    };

    const handleRecurrenceConfirm = (repeatEnabled: boolean, recurrenceDays: number[]) => {
        if (!pendingSession || !sessionDate) return;

        if (repeatEnabled && recurrenceDays.length > 0) {
            const groupId = generateId();
            const baseDate = new Date(sessionDate + 'T12:00:00');
            for (let week = 0; week < 4; week++) {
                for (const dayOfWeek of recurrenceDays) {
                    const targetDate = setDay(addWeeks(baseDate, week), dayOfWeek, { weekStartsOn: 0 });
                    if (targetDate >= baseDate) {
                        dataStore.addCalendarEvent({
                            id: generateId(),
                            title: sessionTitle || 'New Session',
                            date: targetDate,
                            time: sessionTime,
                            type: sessionType === 'match' ? 'match' as const : 'session' as const,
                            sessionId: pendingSession.id,
                            completed: false,
                            sourceId: sessionSourceId || undefined,
                            court: sessionCourt || undefined,
                            recurrenceGroupId: groupId,
                            recurrenceDays,
                        });
                    }
                }
            }
        } else {
            // Single event
            dataStore.addCalendarEvent({
                id: generateId(),
                title: sessionTitle || 'New Session',
                date: new Date(sessionDate),
                time: sessionTime,
                type: sessionType === 'match' ? 'match' as const : 'session' as const,
                sessionId: pendingSession.id,
                completed: false,
                sourceId: sessionSourceId || undefined,
                court: sessionCourt || undefined,
            });
        }

        // Finalize
        setShowRecurrenceModal(false);
        setPendingSession(null);
        localStorage.removeItem('builder_draft');
        setSessionConfigured(false);
        setSelectedExercises([]);
        setShowPreviewModal(false);

        showSuccess('Session saved successfully!', '/calendar');
    };

    const handleSaveAsTemplate = () => {
        setShowPreviewModal(false);

        const sessionExercises: SessionExercise[] = selectedExercises.map((item, index) => ({
            id: generateId(),
            exerciseId: item.exerciseId,
            block: 'technical',
            order: index,
            duration: item.duration,
        }));

        const templateSession: Session = {
            id: generateId(),
            title: sessionTitle || 'New Template',
            type: sessionType,
            isTemplate: true, // Mark as template
            exercises: sessionExercises,
            createdAt: new Date(),
        };

        dataStore.addSession(templateSession);
        // Don't create calendar event for templates
        localStorage.removeItem('builder_draft'); // Clear draft on save

        showSuccess('Template Saved as Library Draft', '/library');
    };

    const totalDuration = selectedExercises.reduce((total, item) => {
        return total + (item.duration || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Date Selection Modal - Shows First */}
            {showDateModal && (
                <DateSelectionModal
                    onConfirm={handleConfigureSession}
                    onClose={() => router.back()}
                />
            )}

            {/* Only show content after session is configured */}
            {sessionConfigured && (
                <>
                    {/* Header */}
                    <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">{sessionTitle || 'New Session'}</h1>
                                        <p className="text-sm text-slate-400">
                                            {sessionDate && new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                            {sessionTime && ` at ${sessionTime}`}
                                            {' • '}
                                            <span className="capitalize">{sessionType}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {selectedExercises.length > 0 && (
                                        <div className="flex items-center gap-3 bg-slate-700/50 px-4 py-2 rounded-lg">
                                            <div className="text-sm">
                                                <span className="text-green-400 font-bold">{selectedExercises.length}</span>
                                                <span className="text-slate-400"> exercises</span>
                                            </div>
                                            <div className="w-px h-6 bg-slate-600"></div>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span className="text-white font-bold">{totalDuration}</span>
                                                <span className="text-slate-400">min</span>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowPreviewModal(true)}
                                        disabled={selectedExercises.length === 0}
                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-4 h-4" />
                                        Review & Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Search and Filters */}
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="flex flex-col gap-4">
                            {/* Top Row - Search + Primary Filters */}
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search exercises..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>

                                {/* Drill Type */}
                                <select
                                    value={filters.drillType}
                                    onChange={(e) => setFilters({ ...filters, drillType: e.target.value })}
                                    className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="baskets">Baskets</option>
                                    <option value="rallies">Rallies</option>
                                    <option value="points">Points</option>
                                    <option value="games">Games</option>
                                </select>

                                {/* Play Mode */}
                                <select
                                    value={filters.playMode}
                                    onChange={(e) => setFilters({ ...filters, playMode: e.target.value })}
                                    className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                                >
                                    <option value="all">All Modes</option>
                                    <option value="singles">Singles</option>
                                    <option value="doubles">Doubles</option>
                                </select>

                                {/* Level */}
                                <select
                                    value={filters.level}
                                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                    className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                                >
                                    <option value="all">All Levels</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="pro">Pro</option>
                                </select>

                                {/* Sort By */}
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                    className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                                >
                                    <option value="recent">Recent</option>
                                    <option value="most-used">Most Used</option>
                                    <option value="highest-rated">Highest Rated</option>
                                    <option value="alphabetical">A-Z</option>
                                </select>

                                {/* Advanced Filters Toggle */}
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 rounded-lg transition border",
                                        showAdvancedFilters
                                            ? "bg-green-500/20 border-green-500 text-green-400"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-green-500"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    Advanced
                                    <ChevronDown className={cn("w-4 h-4 transition", showAdvancedFilters && "rotate-180")} />
                                </button>
                            </div>

                            {/* Focus Areas - Always visible chips */}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-slate-400 py-1.5">Focus:</span>
                                {['forehand', 'backhand', 'serve', 'volley', 'consistency', 'footwork'].map(area => (
                                    <button
                                        key={area}
                                        onClick={() => toggleFocusArea(area)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium transition",
                                            filters.focusAreas.includes(area)
                                                ? "bg-green-500 text-white"
                                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        )}
                                    >
                                        {area}
                                    </button>
                                ))}

                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium hover:bg-red-500/30 transition"
                                    >
                                        <X className="w-3 h-3" />
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {/* Advanced Filters Panel */}
                            {showAdvancedFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    {/* Age Group */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Age Group</label>
                                        <select
                                            value={filters.ageGroup}
                                            onChange={(e) => setFilters({ ...filters, ageGroup: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                        >
                                            <option value="all">All Ages</option>
                                            <option value="kids">Kids</option>
                                            <option value="teens">Teens</option>
                                            <option value="adults">Adults</option>
                                        </select>
                                    </div>

                                    {/* Needs Coach */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Needs Coach</label>
                                        <select
                                            value={filters.needsCoach}
                                            onChange={(e) => setFilters({ ...filters, needsCoach: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                        >
                                            <option value="all">Any</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>

                                    {/* Balls Needed */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Balls Needed</label>
                                        <select
                                            value={filters.ballsNeeded}
                                            onChange={(e) => setFilters({ ...filters, ballsNeeded: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                        >
                                            <option value="all">Any Amount</option>
                                            <option value="0-4">0-4 balls</option>
                                            <option value="4-12">4-12 balls</option>
                                            <option value="12+">12+ balls</option>
                                        </select>
                                    </div>

                                    {/* Player Count Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Players: {filters.playerCount[0]}-{filters.playerCount[1]}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={filters.playerCount[0]}
                                                onChange={(e) => setFilters({ ...filters, playerCount: [parseInt(e.target.value) || 1, filters.playerCount[1]] })}
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                            />
                                            <span className="text-slate-400 py-2">-</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={filters.playerCount[1]}
                                                onChange={(e) => setFilters({ ...filters, playerCount: [filters.playerCount[0], parseInt(e.target.value) || 10] })}
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Minimum Rating */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Rating</label>
                                        <div className="flex gap-2">
                                            {[0, 1, 2, 3, 4, 5].map(rating => (
                                                <button
                                                    key={rating}
                                                    onClick={() => setFilters({ ...filters, minRating: rating })}
                                                    className={cn(
                                                        "flex items-center gap-1 px-3 py-2 rounded-lg transition border text-sm",
                                                        filters.minRating === rating
                                                            ? "bg-green-500/20 border-green-500 text-green-400"
                                                            : "bg-slate-700 border-slate-600 text-slate-400 hover:border-green-500"
                                                    )}
                                                >
                                                    <Star className="w-4 h-4" fill={rating > 0 ? "currentColor" : "none"} />
                                                    {rating === 0 ? 'Any' : `${rating}+`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exercise Grid */}
                    <div className="max-w-7xl mx-auto px-6 pb-12">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 min-w-0">
                                {/* ─── Recommended for Player ─── */}
                        {(() => {
                            if (!sessionSourceId || sessionSourceId === 'user') return null;
                            const allEvents = dataStore.getCalendarEvents();
                            const playerEvents = allEvents.filter(e => e.sourceId === sessionSourceId);
                            const sources = dataStore.getCalendarSources();
                            const playerSource = sources.find(s => s.id === sessionSourceId);
                            const { recommendations } = getRecommendedDrills(playerEvents, exercises, 6);

                            if (recommendations.length === 0) return null;

                            return (
                                <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-400" />
                                            💊 Recommended for {playerSource?.name || 'Player'}
                                            <span className="text-[9px] uppercase font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30">Smart</span>
                                        </h3>
                                        <span className="text-[10px] text-amber-400/60">Based on match analysis</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {recommendations.map(rec => {
                                            const count = getExerciseCount(rec.exercise.id);
                                            return (
                                                <div
                                                    key={rec.exercise.id}
                                                    onClick={() => toggleExerciseSelection(rec.exercise.id)}
                                                    className={cn(
                                                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group",
                                                        count > 0
                                                            ? "bg-green-500/10 border-green-500/30"
                                                            : "bg-slate-800/60 border-amber-500/10 hover:border-amber-500/30"
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                                            rec.relevance >= 70 ? "bg-amber-500/20 text-amber-400" :
                                                                rec.relevance >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                                                                    "bg-slate-700/50 text-slate-400"
                                                        )}>
                                                            {count > 0 ? <Check className="w-4 h-4 text-green-400" /> :
                                                                rec.relevance >= 70 ? '🔥' : '⚡'}
                                                        </div>
                                                        <span className="text-[8px] text-slate-600">{rec.relevance}%</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                                                            {rec.exercise.title}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{rec.exercise.description}</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {rec.matchedGaps.slice(0, 2).map(gap => (
                                                                <span key={gap} className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded capitalize border border-amber-500/20">
                                                                    {gap}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {count > 0 && (
                                                        <div className="bg-green-500 rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-white font-bold text-[10px]">×{count}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredExercises.map((exercise) => {
                                const count = getExerciseCount(exercise.id);
                                const isSelected = count > 0;
                                return (
                                    <div
                                        key={exercise.id}
                                        onClick={() => toggleExerciseSelection(exercise.id)}
                                        className={cn(
                                            "group bg-slate-800 border rounded-xl p-6 cursor-pointer transition",
                                            isSelected
                                                ? "border-green-500 ring-2 ring-green-500/50"
                                                : "border-slate-700 hover:border-green-500/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex flex-col gap-2">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-semibold w-fit",
                                                    exercise.category === 'drill' && "bg-blue-500/20 text-blue-400",
                                                    exercise.category === 'basket' && "bg-purple-500/20 text-purple-400",
                                                    exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400",
                                                    exercise.category === 'game' && "bg-green-500/20 text-green-400"
                                                )}>
                                                    {exercise.category}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className="w-3 h-3 text-yellow-500"
                                                            fill={i < exercise.rating ? "currentColor" : "none"}
                                                        />
                                                    ))}
                                                    <span className="text-xs text-slate-500 ml-1">({exercise.timesUsed} uses)</span>
                                                </div>
                                            </div>
                                            {count > 0 && (
                                                <div className="bg-green-500 rounded-full min-w-[32px] h-8 px-2 flex items-center justify-center">
                                                    <span className="text-white font-bold text-sm">×{count}</span>
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">{exercise.title}</h3>
                                        <p className="text-slate-400 text-sm mb-4 line-clamp-3">{exercise.description}</p>

                                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                            <span className="bg-slate-700/50 px-2 py-1 rounded capitalize">{exercise.level}</span>
                                            <span className="bg-slate-700/50 px-2 py-1 rounded capitalize">{exercise.ageGroup}</span>
                                            <span className="bg-slate-700/50 px-2 py-1 rounded">{exercise.playerCount} players</span>
                                            {exercise.duration && <span className="bg-slate-700/50 px-2 py-1 rounded">{exercise.duration} min</span>}
                                            {exercise.needsCoach && <span className="bg-slate-700/50 px-2 py-1 rounded">Coach</span>}
                                            <span className={cn(
                                                "px-2 py-1 rounded capitalize",
                                                exercise.playMode === 'singles' ? "bg-cyan-500/20 text-cyan-400" :
                                                    exercise.playMode === 'doubles' ? "bg-amber-500/20 text-amber-400" :
                                                        "bg-slate-700/50"
                                            )}>{exercise.playMode}</span>
                                        </div>

                                        {exercise.focusAreas.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {exercise.focusAreas.map(area => (
                                                    <span key={area} className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded capitalize">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filteredExercises.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-slate-500 text-lg">No exercises found. Try adjusting your filters.</p>
                            </div>
                        )}
                            </div>

                            {/* Right Sidebar Widget for Player Insights */}
                            {(() => {
                                const currentPlayer = calendarSources.find(s => s.id === sessionSourceId);
                                if (!currentPlayer || !currentPlayer.trainingPreferences) return null;

                                return (
                                    <div className="w-full lg:w-[320px] shrink-0">
                                        <div className="sticky top-[100px] bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-lg">
                                            <h3 className="text-sm font-bold text-white mb-4">Player Insights</h3>
                                            <div className="flex items-center gap-3 mb-4">
                                                {currentPlayer.imageUrl ? (
                                                    <img src={currentPlayer.imageUrl} alt={currentPlayer.name} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white uppercase shadow-sm" style={{ backgroundColor: currentPlayer.color || '#3b82f6' }}>
                                                        {currentPlayer.initials || currentPlayer.name.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white text-sm">{currentPlayer.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Training Preferences</div>
                                                </div>
                                            </div>
                                            <div className="-mx-2 border border-slate-700/50 rounded-xl bg-slate-900/50 p-2">
                                                <TrainingPreferencesViewer preferences={currentPlayer.trainingPreferences} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}

            {/* Session Preview Modal */}
            {showPreviewModal && (
                <SessionPreviewModal
                    sessionTitle={sessionTitle}
                    sessionType={sessionType}
                    sessionDate={sessionDate}
                    sessionSourceId={sessionSourceId}
                    selectedExercises={selectedExercises}
                    exercises={exercises}
                    onClose={() => setShowPreviewModal(false)}
                    onSaveSession={handleSaveSession}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onUpdateDuration={updateExerciseDuration}
                    onSetDuration={setExerciseDuration}
                />
            )}

            {/* Recurrence Modal */}
            {showRecurrenceModal && (
                <RecurrenceModal
                    date={sessionDate}
                    onConfirm={handleRecurrenceConfirm}
                    onClose={() => {
                        // Save without recurrence
                        handleRecurrenceConfirm(false, []);
                    }}
                />
            )}
        </div>
    );
}

function RecurrenceModal({ date, onConfirm, onClose }: {
    date: string;
    onConfirm: (repeatEnabled: boolean, days: number[]) => void;
    onClose: () => void;
}) {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateObj = new Date(date + 'T12:00:00');
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([getDay(dateObj)]);

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex].sort());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Repeat Weekly?</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Starting {format(dateObj, 'EEEE, MMM d')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-white">Repeat this session</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRepeatEnabled(!repeatEnabled)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                repeatEnabled ? "bg-green-500" : "bg-slate-600"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                                repeatEnabled ? "translate-x-6" : "translate-x-0.5"
                            )} />
                        </button>
                    </div>

                    {/* Day Picker */}
                    {repeatEnabled && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">Select days to repeat (4 weeks)</p>
                            <div className="flex gap-2 justify-center">
                                {dayLabels.map((label, idx) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        className={cn(
                                            "w-10 h-10 rounded-full text-xs font-semibold transition-all",
                                            selectedDays.includes(idx)
                                                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium"
                        >
                            Just Once
                        </button>
                        <button
                            onClick={() => onConfirm(repeatEnabled, selectedDays)}
                            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                        >
                            {repeatEnabled ? `Save (${selectedDays.length} days × 4 wks)` : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DateSelectionModal_OLD({ onConfirm }: {
    onConfirm: (title: string, type: 'practice' | 'match' | 'match-prep', date: string, time: string) => void;
}) {
    const [type, setType] = useState<'practice' | 'match' | 'match-prep'>('practice');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarEvents = useDataStore(() => dataStore.getCalendarEvents());
    const calendarSources = useDataStore(() => dataStore.getCalendarSources());
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(['user', 'aina', 'ricky', 'oscar', 'div2', 'flex', 'campbell']);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getEventsForDate = (date: Date) => {
        return calendarEvents.filter(event =>
            isSameDay(new Date(event.date), date) &&
            (!event.sourceId || selectedSourceIds.includes(event.sourceId))
        );
    };

    const toggleSource = (sourceId: string) => {
        setSelectedSourceIds(prev =>
            prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;

        const dateStr = selectedDate.toISOString().split('T')[0];
        const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const title = `${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')} - ${formattedDate}`;
        onConfirm(title, type, dateStr, '');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Create Session</h2>
                    <p className="text-slate-400 text-sm mt-1">Select type and date to start building your session</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Session Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('practice')}
                                className={cn(
                                    "px-4 py-3 rounded-lg border-2 transition font-medium",
                                    type === 'practice'
                                        ? "bg-green-500/20 border-green-500 text-green-400"
                                        : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                )}
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('match-prep')}
                                className={cn(
                                    "px-4 py-3 rounded-lg border-2 transition font-medium",
                                    type === 'match-prep'
                                        ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                        : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                )}
                            >
                                Practice / Match
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('match')}
                                className={cn(
                                    "px-4 py-3 rounded-lg border-2 transition font-medium",
                                    type === 'match'
                                        ? "bg-purple-500/20 border-purple-500 text-purple-400"
                                        : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                )}
                            >
                                Match
                            </button>
                        </div>
                    </div>

                    {/* Calendar Filters */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Calendars</label>
                        <div className="flex flex-wrap gap-2">
                            {calendarSources.map(source => (
                                <button
                                    key={source.id}
                                    type="button"
                                    onClick={() => toggleSource(source.id)}
                                    className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1.5",
                                        selectedSourceIds.includes(source.id)
                                            ? `bg-slate-700 text-white border-transparent`
                                            : "bg-transparent text-slate-500 border-slate-700 hover:border-slate-500"
                                    )}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", source.color)} />
                                    {source.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-slate-300">Select Date</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="p-1 hover:bg-slate-700 rounded transition"
                                >
                                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                                </button>
                                <span className="text-white font-semibold min-w-32 text-center">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-1 hover:bg-slate-700 rounded transition"
                                >
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-700/30 rounded-xl overflow-hidden border border-slate-700">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 bg-slate-700/50 border-b border-slate-700">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                    <div key={idx} className="p-2 text-center text-xs font-semibold text-slate-400">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7">
                                {daysInMonth.map((day, idx) => {
                                    const dayEvents = getEventsForDate(day);
                                    const isToday = isSameDay(day, new Date());
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "min-h-16 p-1 border-b border-r border-slate-700/50 hover:bg-slate-700/50 transition text-left relative",
                                                isSelected && "bg-green-500/20 border-green-500"
                                            )}
                                        >
                                            <div className={cn(
                                                "text-xs font-medium mb-0.5",
                                                isToday ? "bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-full" : "text-slate-300"
                                            )}>
                                                {format(day, 'd')}
                                            </div>

                                            {dayEvents.length > 0 && (
                                                <div className="space-y-0.5">
                                                    {dayEvents.slice(0, 3).map(event => {
                                                        const source = calendarSources.find(s => s.id === (event.sourceId || 'user'));
                                                        const colorClass = source ? source.color.replace('bg-', 'text-').replace('500', '400') : 'text-slate-400';
                                                        const bgClass = source ? source.color.replace('bg-', 'bg-').replace('500', '500/20') : 'bg-slate-700/50';

                                                        return (
                                                            <div
                                                                key={event.id}
                                                                className={cn(
                                                                    "text-[10px] px-1 py-0.5 rounded truncate",
                                                                    bgClass,
                                                                    colorClass
                                                                )}
                                                            >
                                                                {event.title}
                                                            </div>
                                                        );
                                                    })}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-[10px] text-slate-500">+{dayEvents.length - 2}</div>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {selectedDate && (
                        <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-500">Selected:</span>{' '}
                                <span className="text-white font-semibold">
                                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </span>
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!selectedDate}
                        className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Start Building Session
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Rodeta Reactiva ─── Circular drag dial for adjusting duration
function CircularDial({ value, min, max, onChange, size = 72 }: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    size?: number;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const isDragging = useRef(false);
    const [localValue, setLocalValue] = useState(value);
    const [dragging, setDragging] = useState(false);

    // Sync external value
    useEffect(() => {
        if (!isDragging.current) setLocalValue(value);
    }, [value]);

    const radius = (size - 12) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const progress = (localValue - min) / (max - min);
    const dashOffset = circumference * (1 - progress);

    // Convert pointer position to angle, then to value
    const pointerToValue = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return localValue;
        const rect = svg.getBoundingClientRect();
        const x = clientX - rect.left - cx;
        const y = clientY - rect.top - cy;
        // Angle from top (12 o'clock), clockwise
        let angle = Math.atan2(x, -y); // Note: x, -y for top-start clockwise
        if (angle < 0) angle += 2 * Math.PI;
        const fraction = angle / (2 * Math.PI);
        // Snap to integer minutes
        const raw = min + fraction * (max - min);
        return Math.round(raw);
    }, [cx, cy, min, max, localValue]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        setDragging(true);
        (e.target as Element).setPointerCapture(e.pointerId);
        const v = pointerToValue(e.clientX, e.clientY);
        setLocalValue(v);
    }, [pointerToValue]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const v = pointerToValue(e.clientX, e.clientY);
        setLocalValue(v);
    }, [pointerToValue]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        setDragging(false);
        const v = pointerToValue(e.clientX, e.clientY);
        const clamped = Math.max(min, Math.min(max, v));
        setLocalValue(clamped);
        onChange(clamped);
    }, [pointerToValue, onChange, min, max]);

    // Knob position on the arc
    const knobAngle = progress * 2 * Math.PI - Math.PI / 2; // Start from top
    const knobX = cx + radius * Math.cos(knobAngle);
    const knobY = cy + radius * Math.sin(knobAngle);

    return (
        <div className="flex-shrink-0 select-none" style={{ width: size, height: size }}>
            <svg
                ref={svgRef}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={cn(
                    "cursor-grab transition-transform",
                    dragging && "cursor-grabbing scale-110"
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ touchAction: 'none' }}
            >
                {/* Background track */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke="rgba(100,116,139,0.15)"
                    strokeWidth={strokeWidth}
                />

                {/* Progress arc */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={dragging ? 'rgb(52,211,153)' : 'rgb(16,185,129)'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    className="transition-colors duration-150"
                />

                {/* Invisible hit area for easier grabbing */}
                <circle
                    cx={knobX}
                    cy={knobY}
                    r={14}
                    fill="transparent"
                    className="cursor-grab"
                />

                {/* Knob dot */}
                <circle
                    cx={knobX}
                    cy={knobY}
                    r={dragging ? 7 : 6}
                    fill="rgb(16,185,129)"
                    className="transition-all duration-100"
                />
                {dragging && (
                    <circle
                        cx={knobX}
                        cy={knobY}
                        r={12}
                        fill="rgba(16,185,129,0.15)"
                    />
                )}

                {/* Center value */}
                <text
                    x={cx}
                    y={cy - 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none pointer-events-none"
                    fill={dragging ? 'rgb(52,211,153)' : 'rgb(203,213,225)'}
                    fontSize={size > 56 ? 16 : 14}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                >
                    {localValue}
                </text>
                <text
                    x={cx}
                    y={cy + 12}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none pointer-events-none"
                    fill="rgb(100,116,139)"
                    fontSize={7}
                    fontWeight="600"
                    letterSpacing="0.5"
                    fontFamily="system-ui, sans-serif"
                >
                    MIN
                </text>
            </svg>
        </div>
    );
}

function SessionPreviewModal({ sessionTitle, sessionType, sessionDate, sessionSourceId, selectedExercises, exercises, onClose, onSaveSession, onSaveAsTemplate, onUpdateDuration, onSetDuration }: {
    sessionTitle: string;
    sessionType: 'practice' | 'match' | 'match-prep';
    sessionDate: string;
    sessionSourceId: string | null;
    selectedExercises: { exerciseId: string; instanceId: string; duration: number }[];
    exercises: Exercise[];
    onClose: () => void;
    onSaveSession: () => void;
    onSaveAsTemplate: () => void;
    onUpdateDuration: (instanceId: string, delta: number) => void;
    onSetDuration: (instanceId: string, value: number) => void;
}) {
    // Generate PDF Data
    const calendarSources = dataStore.getCalendarSources();
    const playerName = calendarSources.find(s => s.id === (sessionSourceId || 'user'))?.name || 'Athlete';
    
    // Generate PDF Data
    const pdfSessionData = useMemo(() => {
        let formattedDate = 'Date TBD';
        if (sessionDate) {
            try {
                const date = new Date(sessionDate);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                }
            } catch (e) {
                console.error('Invalid date format:', e);
            }
        }
        
        return {
            title: sessionTitle || 'Untitled Session',
            date: formattedDate,
            playerName: playerName || 'Athlete',
            drills: selectedExercises.map(item => {
                const exercise = exercises.find(e => e.id === item.exerciseId);
                return {
                    id: item.instanceId,
                    name: exercise?.title || 'Unknown Drill',
                    duration: `${item.duration || 10} min`,
                    description: exercise?.description || 'No description available for this exercise.'
                };
            })
        };
    }, [sessionTitle, sessionDate, playerName, selectedExercises, exercises]);

    const totalDuration = selectedExercises.reduce((total, item) => {
        return total + (item.duration || 0);
    }, 0);

    return (
        <>
            {/* Screen Version - Visible on Print with specialized styles */}
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8 print:bg-white print:text-black print:max-h-full print:my-0 print:rounded-none">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 flex-shrink-0 print:border-green-500 print:text-black">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2 print:text-black print:text-center">{sessionTitle}</h2>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                                        sessionType === 'practice' && "bg-green-500/20 text-green-400",
                                        sessionType === 'match' && "bg-purple-500/20 text-purple-400",
                                        sessionType === 'match-prep' && "bg-blue-500/20 text-blue-400"
                                    )}>
                                        {sessionType.replace('-', ' ')}
                                    </span>
                                    <span className="text-sm">
                                        {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <PDFDownloadLink
                                    document={<SessionPDFTemplate session={pdfSessionData} />}
                                    fileName={`${sessionTitle.toLowerCase().replace(/\s+/g, '_')}_report.pdf`}
                                >
                                    {({ loading }) => (
                                        <button
                                            disabled={loading}
                                            className={cn(
                                                "p-2 hover:bg-slate-700 rounded-lg transition",
                                                loading && "opacity-50 cursor-not-allowed"
                                            )}
                                            title="Export as PDF"
                                        >
                                            <Printer className={cn("w-5 h-5", loading ? "text-slate-500" : "text-slate-400")} />
                                        </button>
                                    )}
                                </PDFDownloadLink>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Session Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-400 mb-1">
                                    <Target className="w-4 h-4" />
                                    <span className="text-xs font-semibold uppercase">Exercises</span>
                                </div>
                                <span className="text-2xl font-bold text-white">{selectedExercises.length}</span>
                            </div>
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-blue-400 mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-semibold uppercase">Duration</span>
                                </div>
                                <span className="text-2xl font-bold text-white">{totalDuration} min</span>
                            </div>
                        </div>
                    </div>

                    {/* Exercise List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-6">
                            {selectedExercises.length} exercises · {totalDuration} min
                        </h3>
                        <div className="space-y-3 pb-4">
                            {selectedExercises.map((item, index) => {
                                const exercise = exercises.find(e => e.id === item.exerciseId);
                                if (!exercise) return null;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04, ease: 'easeOut' }}
                                        key={item.instanceId}
                                        className="flex items-center gap-4 py-4 px-2 border-b border-slate-800/80 last:border-0 group"
                                    >
                                        {/* Minimal order number */}
                                        <span className="text-xs font-mono text-slate-600 w-5 text-right flex-shrink-0">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>

                                        {/* Exercise info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                                                {exercise.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500 capitalize">{exercise.category}</span>
                                                <span className="text-slate-700">·</span>
                                                <span className="text-[10px] text-slate-500 capitalize">{exercise.level}</span>
                                                {exercise.playerCount > 0 && (
                                                    <>
                                                        <span className="text-slate-700">·</span>
                                                        <span className="text-[10px] text-slate-500">{exercise.playerCount}p</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rodeta Reactiva */}
                                        <CircularDial
                                            value={item.duration}
                                            min={5}
                                            max={120}
                                            onChange={(v: number) => onSetDuration(item.instanceId, v)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => {
                                    onSaveSession();
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
                            >
                                <Save className="w-4 h-4" />
                                Save Session
                            </button>
                            <button
                                onClick={() => {
                                    onSaveAsTemplate();
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                            >
                                <BookMarked className="w-4 h-4" />
                                Save as Template
                            </button>
                            <div className="flex-1">
                                <PDFDownloadLink
                                    document={<SessionPDFTemplate session={pdfSessionData} />}
                                    fileName={`${sessionTitle.toLowerCase().replace(/\s+/g, '_')}_report.pdf`}
                                >
                                    {({ loading }) => (
                                        <button
                                            disabled={loading}
                                            className={cn(
                                                "w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-semibold",
                                                loading && "opacity-70 cursor-not-allowed"
                                            )}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            {loading ? 'Preparing...' : 'Export as PDF'}
                                        </button>
                                    )}
                                </PDFDownloadLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Version - Hidden on Screen */}
            <div className="hidden print:block bg-white text-black p-8 overflow-visible">
                {/* Minimal Header */}
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Coach Pocket Academy</div>
                        <h1 className="text-4xl font-bold text-black mt-1">{sessionTitle}</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-medium text-slate-900">
                            {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-slate-500 capitalize mt-1">
                            {sessionType.replace('-', ' ')} • {totalDuration} min • {selectedExercises.length} Exercises
                        </div>
                    </div>
                </div>

                {/* Exercise List - High Readability */}
                <div className="space-y-6">
                    {selectedExercises.map((item, index) => {
                        const exercise = exercises.find(e => e.id === item.exerciseId);
                        if (!exercise) return null;

                        return (
                            <div key={item.instanceId} className="flex gap-4 break-inside-avoid">
                                {/* Large Index Number */}
                                <div className="w-12 text-3xl font-bold text-slate-300 text-right shrink-0 leading-none mt-1">
                                    {(index + 1).toString().padStart(2, '0')}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-6 border-b border-slate-100 last:border-0">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h3 className="text-2xl font-bold text-black">{exercise.title}</h3>
                                        <div className="flex gap-3 text-sm font-medium">
                                            {exercise.duration && (
                                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-700">
                                                    {exercise.duration} min
                                                </span>
                                            )}
                                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 capitalize">
                                                {exercise.category}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-slate-700 text-base leading-relaxed mb-3 max-w-[90%]">
                                        {exercise.description}
                                    </p>

                                    {/* Footer Details */}
                                    <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <span>Level: {exercise.level}</span>
                                        {exercise.playerCount && <span>Players: {exercise.playerCount}</span>}
                                        {exercise.focusAreas.length > 0 && <span>Focus: {exercise.focusAreas.slice(0, 3).join(', ')}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t border-slate-200 mt-auto">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                        <div className="uppercase tracking-widest font-bold">Notes</div>
                        <div>Generated by Coach Pocket Academy</div>
                    </div>
                </div>

                <style jsx global>{`
                    @media print {
                        @page {
                            size: portrait;
                            margin: 0;
                        }
                        /* Zero out all elements by default to remove ghost pages */
                        body * {
                            visibility: hidden;
                            height: 0;
                            overflow: hidden;
                        }
                        /* Restore specific print elements */
                        .print\:block, .print\:block * {
                            visibility: visible;
                            height: auto;
                            overflow: visible;
                        }
                        .print\:block {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto;
                            background: white;
                            margin: 0;
                            padding: 0;
                        }
                    }
                `}</style>
            </div>
        </>
    );
}

// New Implementation: Multi-step Session Creation Wizard
function DateSelectionModal({ onConfirm, onClose }: {
    onConfirm: (title: string, type: 'practice' | 'match' | 'match-prep', date: string, time: string, sourceId?: string) => void;
    onClose: () => void;
}) {
    const [step, setStep] = useState<'source' | 'date'>('source');
    const [type, setType] = useState<'practice' | 'match' | 'match-prep'>('practice');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarEvents = useDataStore(() => dataStore.getCalendarEvents());
    const calendarSources = useDataStore(() => dataStore.getCalendarSources());
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

    const activeSource = calendarSources.find(s => s.id === selectedSourceId);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getEventsForDate = (date: Date) => {
        return calendarEvents.filter(event => {
            const isDateMatch = isSameDay(new Date(event.date), date);
            if (!isDateMatch) return false;

            // If viewing "My Calendar", show events with no source (legacy) or explicitly 'user'
            if (selectedSourceId === 'user') {
                return !event.sourceId || event.sourceId === 'user';
            }

            // Otherwise, strictly filter by selected source
            return event.sourceId === selectedSourceId;
        });
    };

    const handleSourceSelect = (sourceId: string) => {
        setSelectedSourceId(sourceId);
        setStep('date');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedSourceId) return;

        // Fix: Use local date string to avoid timezone offset issues (ISO string converts to UTC)
        const offset = selectedDate.getTimezoneOffset();
        const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];
        const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const sourceName = activeSource?.name.split(' ')[0] || 'Session';
        const title = `${sourceName} ${type === 'practice' ? 'Practice' : type === 'match' ? 'Match' : 'Prep'} - ${formattedDate}`;
        onConfirm(title, type, dateStr, '09:00', selectedSourceId);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
                {step === 'source' ? (
                    <div className="p-6">
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Who is this for?</h2>
                                <p className="text-slate-400 text-sm mt-1">Select a calendar to start planning your session</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {calendarSources.map(source => (
                                <button
                                    key={source.id}
                                    type="button"
                                    onClick={() => handleSourceSelect(source.id)}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition text-left group"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg",
                                        source.color
                                    )}>
                                        {source.initials || source.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-green-400 transition">{source.name}</h3>
                                        <p className="text-xs text-slate-400 capitalize">{source.type}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-500 ml-auto group-hover:text-white transition" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Header with Back button and Source Selector */}
                        <div className="flex flex-col gap-4 border-b border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep('source')}
                                    className="p-2 -ml-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        Planning Session
                                    </h2>
                                    <p className="text-slate-400 text-xs">for {activeSource?.name}</p>
                                </div>
                            </div>

                            {/* Source Quick Switcher */}
                            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                                {calendarSources.map(source => (
                                    <button
                                        key={source.id}
                                        type="button"
                                        onClick={() => setSelectedSourceId(source.id)}
                                        className={cn(
                                            "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition",
                                            selectedSourceId === source.id
                                                ? "bg-slate-700 text-white border-slate-500"
                                                : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500"
                                        )}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", source.color)} />
                                        {source.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Session Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('practice')}
                                    className={cn(
                                        "px-4 py-3 rounded-lg border-2 transition font-medium",
                                        type === 'practice'
                                            ? "bg-green-500/20 border-green-500 text-green-400"
                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                    )}
                                >
                                    Practice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('match-prep')}
                                    className={cn(
                                        "px-4 py-3 rounded-lg border-2 transition font-medium",
                                        type === 'match-prep'
                                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                    )}
                                >
                                    Match
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('match')}
                                    className={cn(
                                        "px-4 py-3 rounded-lg border-2 transition font-medium",
                                        type === 'match'
                                            ? "bg-purple-500/20 border-purple-500 text-purple-400"
                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                                    )}
                                >
                                    Match
                                </button>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-medium text-slate-300">Select Date</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        className="p-1 hover:bg-slate-700 rounded transition"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                    <span className="text-white font-semibold min-w-32 text-center">
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        className="p-1 hover:bg-slate-700 rounded transition"
                                    >
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-700/30 rounded-xl overflow-hidden border border-slate-700">
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 bg-slate-700/50 border-b border-slate-700">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                        <div key={idx} className="p-2 text-center text-xs font-semibold text-slate-400">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7">
                                    {daysInMonth.map((day, idx) => {
                                        const dayEvents = getEventsForDate(day);
                                        const isToday = isSameDay(day, new Date());
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedDate(day)}
                                                className={cn(
                                                    "min-h-16 p-1 border-b border-r border-slate-700/50 hover:bg-slate-700/50 transition text-left relative",
                                                    isSelected && "bg-green-500/20 border-green-500"
                                                )}
                                            >
                                                <div className={cn(
                                                    "text-xs font-medium mb-0.5",
                                                    isToday ? "bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-full" : "text-slate-300"
                                                )}>
                                                    {format(day, 'd')}
                                                </div>

                                                {dayEvents.length > 0 && (
                                                    <div className="space-y-0.5">
                                                        {dayEvents.slice(0, 3).map(event => {
                                                            const source = calendarSources.find(s => s.id === (event.sourceId || 'user'));
                                                            const colorClass = source ? source.color.replace('bg-', 'text-').replace('500', '400') : 'text-slate-400';
                                                            const bgClass = source ? source.color.replace('bg-', 'bg-').replace('500', '500/20') : 'bg-slate-700/50';

                                                            return (
                                                                <div
                                                                    key={event.id}
                                                                    className={cn(
                                                                        "text-[10px] px-1 py-0.5 rounded truncate",
                                                                        bgClass,
                                                                        colorClass
                                                                    )}
                                                                >
                                                                    {event.title}
                                                                </div>
                                                            );
                                                        })}
                                                        {dayEvents.length > 3 && (
                                                            <div className="text-[10px] text-slate-500">+{dayEvents.length - 3}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {selectedDate && (
                            <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
                                <p className="text-sm text-slate-300">
                                    <span className="text-slate-500">Selected:</span>{' '}
                                    <span className="text-white font-semibold">
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                    </span>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!selectedDate}
                            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Building Session
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
