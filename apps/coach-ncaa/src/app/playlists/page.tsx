'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataStore, Playlist, Session, Exercise, TrainingProgram } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { generateId, cn } from '@/lib/utils';
import { useSuccess } from '@/lib/SuccessContext';
import { Dumbbell, ArrowLeft, Plus, Trash2, Lock, Globe, BookMarked, Calendar, Clock, Target, Eye, X, Users, Printer, School, TrendingUp, Layers, Play, Copy, Calendar as CalendarIcon, MoreVertical, LayoutGrid, List, PlayCircle, FolderOpen, Share2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

export default function SessionsPage() {
    const router = useRouter();
    const { showSuccess } = useSuccess();
    const { t } = useLanguage();
    const playlists = useDataStore(() => dataStore.getPlaylists());
    const templateSessions = useDataStore(() => dataStore.getSessions().filter(s => s.isTemplate));
    const exercises = useDataStore(() => dataStore.getExercises());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Playlist | Session | null>(null);
    const [viewingSession, setViewingSession] = useState<Session | null>(null);
    const [usingTemplate, setUsingTemplate] = useState<Session | null>(null);
    const programs = useDataStore(() => dataStore.getPrograms());

    const handleCreateTemplate = (name: string, type: 'practice' | 'match' | 'match-prep') => {
        if (!name.trim()) return;

        const newSession: Session = {
            id: generateId(),
            title: name,
            type: type, // Now we ask for type
            isTemplate: true,
            exercises: [],
            createdAt: new Date(),
        };

        dataStore.addSession(newSession);
        setShowCreateModal(false);

        // Toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5';
        toast.textContent = 'Template created! Redirecting to builder...';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        // Redirect to builder
        router.push(`/builder?sessionId=${newSession.id}`);
    };

    const handleDeletePlaylist = (id: string) => {
        if (confirm('Are you sure you want to delete this playlist?')) {
            dataStore.deletePlaylist(id);
            setSelectedItem(null);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            dataStore.deleteSession(id);
            setSelectedItem(null);
        }
    };

    const handleUseTemplate = (session: Session) => {
        setUsingTemplate(session);
    };

    const confirmUseTemplate = (date: Date, assignee: string) => {
        if (!usingTemplate) return;

        // Map session.type (practice, match, match-prep) to CalendarEvent.type (session, match, match-prep, event)
        let eventType: 'session' | 'match' | 'match-prep' | 'event' = 'session';
        if (usingTemplate.type === 'match') eventType = 'match';
        else if (usingTemplate.type === 'match-prep') eventType = 'match-prep';

        // Create a new calendar event
        const newEvent = {
            id: generateId(),
            title: `${usingTemplate.title} - ${assignee}`,
            date: date,
            time: '09:00', // Default time, could be made selectable
            type: eventType, // Use the mapped eventType
            sessionId: usingTemplate.id, // Link to the template session
            notes: `Assigned to ${assignee}`,
            completed: false,
            sourceId: 'user',
        };

        dataStore.addCalendarEvent(newEvent);

        setUsingTemplate(null);
        showSuccess('Template assigned to calendar!', '/');
    };

    const totalItems = playlists.length + templateSessions.length + programs.length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">My Sessions</h1>
                        <p className="text-sm text-slate-400">Saved templates and playlists</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/program-builder')}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-500/20"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Program Builder
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
                    >
                        <Plus className="w-4 h-4" />
                        New Template
                    </button>
                </div>
            </div>

            <div>
                {totalItems === 0 ? (
                    <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center min-h-[400px]">
                        <Dumbbell className="w-16 h-16 text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Templates Created</h3>
                        <p className="text-slate-400 max-w-sm mb-6">
                            Save your favorite drill combinations as templates for quick session building.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl transition flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            Create First Template
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Training Programs */}
                        {programs.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    Training Programs
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {programs.map((prog: TrainingProgram, index: number) => (
                                        <div
                                            key={`${prog.id}-${index}`}
                                            className="group bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-lg font-bold text-white">{prog.title}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded-full",
                                                            prog.status === 'active' && "bg-green-500/20 text-green-400",
                                                            prog.status === 'draft' && "bg-yellow-500/20 text-yellow-400",
                                                            prog.status === 'completed' && "bg-slate-500/20 text-slate-400"
                                                        )}>
                                                            {prog.status}
                                                        </span>
                                                        {prog.isBlueprint && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                                Blueprint
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(t('pl.deleteProgram'))) {
                                                            dataStore.deleteProgram(prog.id);
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                                <div className="flex items-center gap-1">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    {prog.totalWeeks} {t('pb.weeks').toLowerCase()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {prog.daysPerWeek}x/{t('pb.weeks').toLowerCase().slice(0, -1)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {prog.totalWeeks * prog.daysPerWeek} {t('pb.sessions').toLowerCase()}
                                                </div>
                                            </div>
                                            {prog.assignedTo && (
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> {prog.assignedTo}
                                                </div>
                                            )}
                                            <div className="mt-3 flex gap-1">
                                                {prog.weeks.slice(0, 6).map((w: any, wIdx: number) => (
                                                    <div key={wIdx} className="flex-1 h-1.5 rounded-full bg-emerald-500/30" title={`S${w.weekNumber}: ${w.theme}`} />
                                                ))}
                                                {prog.weeks.length > 6 && <span className="text-[10px] text-slate-600">+{prog.weeks.length - 6}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Template Sessions */}
                        {templateSessions.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <BookMarked className="w-5 h-5 text-blue-400" />
                                    Session Templates
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templateSessions.map((session, index) => {
                                        const sessionExercises = session.exercises.map(se =>
                                            exercises.find((e: Exercise) => e.id === se.exerciseId)
                                        ).filter(Boolean);

                                        const totalDuration = session.exercises.reduce((sum, se) =>
                                            sum + (se.duration || 0), 0
                                        );

                                        return (
                                            <div
                                                key={`${session.id}-${index}`}
                                                className="group bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="text-xl font-bold text-white">{session.title}</h3>
                                                            <span className={cn(
                                                                "text-xs px-2 py-0.5 rounded-full capitalize",
                                                                session.type === 'practice' && "bg-green-500/20 text-green-400",
                                                                session.type === 'match' && "bg-purple-500/20 text-purple-400",
                                                                session.type === 'match-prep' && "bg-blue-500/20 text-blue-400"
                                                            )}>
                                                                {session.type}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                                            <div className="flex items-center gap-1">
                                                                <Target className="w-4 h-4" />
                                                                {session.exercises.length} exercises
                                                            </div>
                                                            {totalDuration > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock className="w-4 h-4" />
                                                                        {totalDuration} min
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTemplate(session.id);
                                                        }}
                                                        className="p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    {sessionExercises.slice(0, 3).map((exercise: any, idx) => (
                                                        <div key={`${exercise.id}-${idx}`} className="text-sm text-slate-400 flex items-center gap-2">
                                                            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                                            {exercise.title}
                                                        </div>
                                                    ))}
                                                    {sessionExercises.length > 3 && (
                                                        <div className="text-sm text-slate-500">+{sessionExercises.length - 3} more</div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleUseTemplate(session)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Use Template
                                                </button>
                                                <button
                                                    onClick={() => setViewingSession(session)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View Details
                                                </button>
                                            </div>

                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Playlists */}
                        {playlists.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-green-400" />
                                    Drill Playlists
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {playlists.map((playlist: Playlist, index: number) => {
                                        const playlistExercises = exercises.filter((ex: Exercise) => playlist.exerciseIds.includes(ex.id));

                                        return (
                                            <div
                                                key={`${playlist.id}-${index}`}
                                                onClick={() => setSelectedItem(playlist)}
                                                className="group cursor-pointer bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold text-white mb-1">{playlist.name}</h3>
                                                        <p className="text-sm text-slate-400">{playlistExercises.length} exercises</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {playlist.isPublic ? (
                                                            <Globe className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <Lock className="w-4 h-4 text-slate-500" />
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePlaylist(playlist.id);
                                                            }}
                                                            className="p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {playlistExercises.slice(0, 3).map((exercise: any, idx: number) => (
                                                        <div key={`${exercise.id}-${idx}`} className="text-sm text-slate-400 flex items-center gap-2">
                                                            <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                                            {exercise.title}
                                                        </div>
                                                    ))}
                                                    {playlistExercises.length > 3 && (
                                                        <div className="text-sm text-slate-500">+{playlistExercises.length - 3} more</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {
                    showCreateModal && (
                        <CreateTemplateModal
                            onClose={() => setShowCreateModal(false)}
                            onCreate={handleCreateTemplate}
                        />
                    )
                }

                {
                    viewingSession && (
                        <SessionViewModal
                            session={viewingSession}
                            exercises={exercises}
                            onClose={() => setViewingSession(null)}
                        />
                    )
                }

                {
                    usingTemplate && (
                        <UseTemplateModal
                            session={usingTemplate}
                            onClose={() => setUsingTemplate(null)}
                            onConfirm={confirmUseTemplate}
                        />
                    )
                }
            </div>
        </div>
    );
}

function CreateTemplateModal({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (name: string, type: 'practice' | 'match' | 'match-prep') => void;
}) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'practice' | 'match' | 'match-prep'>('practice');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, type);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Create New Template</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Serve Day, Match Strategy"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['practice', 'match', 'match-prep'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${type === t
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                >
                                    {t.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                            Create & Edit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SessionViewModal({ session, exercises, onClose }: {
    session: Session;
    exercises: Exercise[];
    onClose: () => void;
}) {
    const totalDuration = session.exercises.reduce((sum, e) => sum + (e.duration || 0), 0);
    const sessionDate = session.createdAt;

    const handlePrintPDF = () => {
        window.print();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
                <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 flex-shrink-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{session.title}</h2>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                                        session.type === 'practice' && "bg-green-500/20 text-green-400",
                                        session.type === 'match' && "bg-purple-500/20 text-purple-400",
                                        session.type === 'match-prep' && "bg-blue-500/20 text-blue-400"
                                    )}>
                                        {session.type?.replace('-', ' ') || 'Session'}
                                    </span>
                                    <span className="text-sm">
                                        Created: {new Date(sessionDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700 rounded-lg transition"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Session Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-400 mb-1">
                                    <Target className="w-4 h-4" />
                                    <span className="text-xs font-semibold uppercase">Exercises</span>
                                </div>
                                <span className="text-2xl font-bold text-white">{session.exercises.length}</span>
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
                        <h3 className="text-lg font-bold text-white mb-4">Exercise Breakdown</h3>
                        <div className="space-y-3">
                            {session.exercises.map((item, index) => {
                                const exercise = exercises.find(e => e.id === item.exerciseId);
                                if (!exercise) return null;

                                return (
                                    <div
                                        key={`${item.id}-${index}`}
                                        className="bg-slate-700/30 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="bg-slate-700 rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg font-bold text-white">{index + 1}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white">{exercise.title}</h4>
                                                        <p className="text-sm text-slate-400 mt-1">{exercise.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-md text-xs font-semibold capitalize",
                                                        exercise.category === 'drill' && "bg-blue-500/20 text-blue-400",
                                                        exercise.category === 'basket' && "bg-purple-500/20 text-purple-400",
                                                        exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400",
                                                        exercise.category === 'game' && "bg-green-500/20 text-green-400"
                                                    )}>
                                                        {exercise.category}
                                                    </span>
                                                    <span className="bg-slate-700 px-2 py-1 rounded-md text-xs text-slate-300 capitalize">
                                                        {exercise.level}
                                                    </span>
                                                    {item.duration && (
                                                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {item.duration} min
                                                        </span>
                                                    )}
                                                    {exercise.playerCount && (
                                                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {exercise.playerCount} players
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handlePrintPDF}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-semibold"
                            >
                                <Printer className="w-4 h-4" />
                                Print PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Version - Hidden on Screen */}
            <div className="hidden print:block bg-white text-black p-8 max-w-4xl mx-auto h-screen">
                {/* Modern Header */}
                <div className="flex items-center justify-between mb-8 border-b-2 border-slate-900 pb-6">
                    <div className="flex items-center gap-4">
                        {/* Logo Placeholder */}
                        <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white print:bg-slate-900 print:text-white">
                            <School className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">Coach Pocket Academy</h1>
                            <p className="text-sm text-slate-500 font-medium tracking-wide">Elite Tennis Training</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Session Plan</div>
                        <h2 className="text-3xl font-bold text-slate-900">{session.title}</h2>
                        <div className="flex items-center justify-end gap-2 text-slate-500 mt-1">
                            <span className="font-medium">
                                Created: {new Date(sessionDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Session Stats Bar */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase">Type</div>
                        <div className="font-bold text-slate-900 capitalize">{session.type?.replace('-', ' ') || 'Session'}</div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase">Duration</div>
                        <div className="font-bold text-slate-900">{totalDuration} min</div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase">Exercises</div>
                        <div className="font-bold text-slate-900">{session.exercises.length}</div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase">Coach</div>
                        <div className="font-bold text-slate-900">Coach Pocket</div>
                    </div>
                </div>

                {/* Exercise List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Exercise Breakdown</h3>
                        <span className="text-xs text-slate-400 uppercase font-semibold">Ordered List</span>
                    </div>

                    {session.exercises.map((item, index) => {
                        const exercise = exercises.find(e => e.id === item.exerciseId);
                        if (!exercise) return null;

                        return (
                            <div key={`${item.id}-${index}`} className="flex gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-lg font-bold text-xl flex-shrink-0 print:bg-slate-900 print:text-white">
                                    {index + 1}
                                </div>
                                <div className="flex-1 border-b border-slate-100 pb-6 mb-2">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xl font-bold text-slate-900">{exercise.title}</h4>
                                        <div className="flex gap-2">
                                            {item.duration && (
                                                <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                                    {item.duration} min
                                                </span>
                                            )}
                                            <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 capitalize">
                                                {exercise.category}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 leading-relaxed mb-3">{exercise.description}</p>

                                    <div className="flex gap-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        <span>Level: {exercise.level}</span>
                                        {exercise.playerCount && <span>Players: {exercise.playerCount}</span>}
                                        {exercise.focusAreas.length > 0 && <span>Focus: {exercise.focusAreas.slice(0, 3).join(', ')}</span>}
                                    </div>
                                    {item.notes && (
                                        <div className="mt-2 text-sm text-slate-500 italic">
                                            Note: {item.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Notes Section footer */}
                <div className="mt-12 pt-8 border-t-2 border-slate-900">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Coach Notes</div>
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl"></div>
                </div>

                <div className="text-center mt-8 text-slate-400 text-xs text-center border-t border-slate-100 pt-4">
                    Generated by Coach Pocket Academy • {new Date().getFullYear()}
                </div>
            </div>
        </>
    );
}

function UseTemplateModal({ session, onClose, onConfirm }: {
    session: Session;
    onClose: () => void;
    onConfirm: (date: Date, assignee: string) => void;
}) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [assignee, setAssignee] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(new Date(date), assignee);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Use Template</h2>
                        <p className="text-slate-400 text-sm mt-1">{session.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Who is this session for?</label>
                        <input
                            type="text"
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                            placeholder="e.g., John Doe, Junior Group"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">When is it scheduled?</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            Schedule Session
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
