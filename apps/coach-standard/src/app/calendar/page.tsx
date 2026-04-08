'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataStore, CalendarEvent } from '@coach-pocket/core';
import { generateId, cn } from '@/lib/utils';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Trash2, X, CheckCircle, Repeat, Edit, Trophy, Users, UserPlus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, getDay } from 'date-fns';
import MatchNotesModal from '@/components/features/match/MatchNotesModal';
import MatchChartingTool from '@/components/features/match/MatchChartingTool';

import { useAuth } from '@coach-pocket/core';
import { useSuccess } from '@/lib/SuccessContext';

import { useDataStore } from '@/lib/useDataStore';

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="w-6 h-6 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin" /></div>}>
            <CalendarContent />
        </Suspense>
    );
}

function CalendarContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showSuccess } = useSuccess();
    const currentDateParam = searchParams.get('month');
    const [currentDate, setCurrentDate] = useState(currentDateParam ? new Date(currentDateParam) : new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

    // Use reactive custom hook for events and sources
    const rawEvents = useDataStore(() => dataStore.getCalendarEvents());
    const rawSources = useDataStore(() => dataStore.getCalendarSources());
    const role = dataStore.getEffectiveRole();

    // Derived states
    const events = rawEvents;
    const calendarSources = role === 'player' 
        ? rawSources.filter(s => s.id === 'user')
        : rawSources;

    const [selectedSourceId, setSelectedSourceId] = useState<string>('user');

    useEffect(() => {
        if (role === 'player') {
            setSelectedSourceId('user');
        }
    }, [role]);

    // URL-driven state for Add Event Modal
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam ? new Date(dateParam + 'T12:00:00') : null;
    const showEventModal = !!selectedDate;

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const [showEditModal, setShowEditModal] = useState(false);

    // Match features state
    const [showMatchNotesModal, setShowMatchNotesModal] = useState(false);
    const [showChartingTool, setShowChartingTool] = useState(false);

    const startDate = viewMode === 'month' ? startOfMonth(currentDate) : viewMode === 'week' ? startOfWeek(currentDate) : currentDate;
    const endDate = viewMode === 'month' ? endOfMonth(currentDate) : viewMode === 'week' ? endOfWeek(currentDate) : currentDate;
    const daysToShow = viewMode === 'day' ? [currentDate] : eachDayOfInterval({ start: startDate, end: endDate });
    const paddingDays = viewMode === 'month' ? Array.from({ length: getDay(startDate) }) : [];

    const handlePrevious = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const isDateMatch = isSameDay(new Date(event.date), date);
            if (!isDateMatch) return false;

            // If "My Calendar" ('user') is selected, show EVERYTHING (Aggregate View)
            if (selectedSourceId === 'user') {
                return true;
            }

            // Otherwise, filter by specific source (Player/Team specific view)
            return event.sourceId === selectedSourceId;
        });
    };

    const handleAddEvent = (eventData: Partial<CalendarEvent>) => {
        if (!selectedDate) return;

        const newEvent: CalendarEvent = {
            id: generateId(),
            title: eventData.title || 'Untitled Event',
            date: selectedDate,
            time: eventData.time,
            type: eventData.type || 'session',
            sessionId: eventData.sessionId,
            notes: eventData.notes,
            completed: false,
            sourceId: eventData.sourceId || selectedSourceId,
        };
        dataStore.addCalendarEvent(newEvent);

        showSuccess('Event added successfully!');
    };

    const handleUpdateEvent = (eventId: string, updates: Partial<CalendarEvent>) => {
        dataStore.updateCalendarEvent(eventId, updates);
        setShowEditModal(false);
        // If we were editing notes, keep the selectedEvent up to date locally
        if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent({ ...selectedEvent, ...updates });
        } else {
            setSelectedEvent(null);
        }
    };

    const handleDeleteEvent = (eventId: string) => {
        dataStore.deleteCalendarEvent(eventId);
        setShowViewModal(false);
        setSelectedEvent(null);
    };

    const handleDeleteSeries = (groupId: string) => {
        dataStore.deleteCalendarEventsByGroup(groupId);
        setShowViewModal(false);
        setSelectedEvent(null);
    };

    const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setShowViewModal(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Calendar</h1>
                        <div className="flex overflow-x-auto gap-2 mt-2 scrollbar-none max-w-[calc(100vw-100px)] lg:max-w-none">
                            {calendarSources.map((source, index) => (
                                <button
                                    key={`${source.id}-${index}`}
                                    onClick={() => setSelectedSourceId(source.id)}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition",
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
                </div>

                {/* View Mode Toggles */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 self-start md:self-auto">
                    {(['month', 'week', 'day'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition capitalize",
                                viewMode === mode
                                    ? "bg-slate-700 text-white shadow"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {/* Calendar Controls */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                        {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                        {viewMode === 'week' && `Week of ${format(startDate, 'MMM d, yyyy')}`}
                        {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevious}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="hidden md:block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition border border-slate-700"
                        >
                            Today
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    {/* Weekday Headers */}
                    {viewMode !== 'day' && (
                        <div className="grid grid-cols-7 bg-slate-700/50 border-b border-slate-700">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                <div key={day} className="p-3 md:p-4 text-center text-xs md:text-sm font-semibold text-slate-300">
                                    {day}
                                    {viewMode === 'week' && (
                                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                                            {format(daysToShow[i], 'd')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Calendar Days */}
                    <div className={cn("grid", viewMode === 'day' ? "grid-cols-1" : "grid-cols-7")}>
                        {viewMode === 'month' && paddingDays.map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-32 p-2 border-b border-r border-slate-700/50 opacity-40 bg-slate-800/80" />
                        ))}
                        {daysToShow.map((day, idx) => {
                            const dayEvents = getEventsForDate(day);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "p-2 border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer transition",
                                        viewMode !== 'day' && "border-r min-h-32",
                                        viewMode === 'day' && "min-h-[400px] p-6"
                                    )}
                                    onClick={() => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        router.push(`/calendar?date=${dateStr}`);
                                    }}
                                >
                                    {viewMode !== 'day' && (
                                        <div className={`text-sm font-medium mb-2 ${isToday ? 'bg-green-500 text-white w-7 h-7 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                                            {format(day, 'd')}
                                        </div>
                                    )}

                                    <div className={cn("space-y-1", viewMode === 'day' && "space-y-3 mt-4")}>
                                        {dayEvents.length === 0 && viewMode === 'day' && (
                                            <div className="text-slate-500 text-center py-10">No events scheduled. click to add one.</div>
                                        )}
                                        {dayEvents.slice(0, viewMode === 'month' ? 4 : undefined).map(event => (
                                            <div
                                                key={`${event.id}-${idx}`}
                                                onClick={(e) => handleEventClick(event, e)}
                                                className={cn(
                                                    `px-2 py-1.5 rounded cursor-pointer hover:opacity-80 transition flex items-center gap-2`,
                                                    viewMode === 'day' ? "text-sm border" : "text-xs truncate",
                                                    event.completed
                                                        ? 'bg-green-500/30 text-green-300 line-through opacity-70 border-green-500/20'
                                                        : event.type === 'session' ? 'bg-green-500/20 text-green-400 border-green-500/20'
                                                            : event.type === 'team-session' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                                : event.type === 'match' ? 'bg-purple-500/20 text-purple-400 border-purple-500/20'
                                                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                )}
                                            >
                                                {viewMode === 'day' && event.time && (
                                                    <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-[10px] shrink-0">{event.time}</span>
                                                )}
                                                {event.court && (
                                                    <span 
                                                        className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0" 
                                                        title={event.court}
                                                    >
                                                        {(() => {
                                                            const m = event.court.match(/^(Court|Pista)\s*(\d+)$/i);
                                                            return m ? `${m[1][0].toUpperCase()}${m[2]}` : (event.court.length <= 3 ? event.court.toUpperCase() : event.court.substring(0, 3).toUpperCase());
                                                        })()}
                                                    </span>
                                                )}
                                                {event.completed && <CheckCircle className="w-3 h-3 shrink-0" />}
                                                {event.recurrenceGroupId && <Repeat className="w-3 h-3 shrink-0" />}
                                                <span className="truncate flex-1">{event.title}</span>
                                            </div>
                                        ))}
                                        {dayEvents.length > 4 && viewMode === 'month' && (
                                            <div className="text-xs text-slate-500 pl-1">+{dayEvents.length - 4} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex gap-6 justify-center flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-slate-400">Practice (Individual)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-slate-400">Team Session</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm text-slate-400">Match</span>
                    </div>

                </div>
            </div>

            {/* Add Event Modal */}
            {showEventModal && selectedDate && (
                <EventModal
                    date={selectedDate}
                    sources={calendarSources}
                    onClose={() => router.push('/calendar')}
                    onSave={handleAddEvent}
                />
            )}

            {/* Edit Event Modal */}
            {showEditModal && selectedEvent && (
                <EditEventModal
                    event={selectedEvent}
                    onClose={() => setShowEditModal(false)}
                    onSave={(updates) => handleUpdateEvent(selectedEvent.id, updates)}
                />
            )}

            {/* View Event Modal */}
            {showViewModal && selectedEvent && (
                <ViewEventModal
                    event={selectedEvent}
                    onClose={() => {
                        setShowViewModal(false);
                        setSelectedEvent(null);
                    }}
                    onEdit={() => {
                        setShowViewModal(false);
                        setShowEditModal(true);
                    }}
                    onDelete={handleDeleteEvent}
                    onDeleteSeries={handleDeleteSeries}
                    onViewSession={(sessionId) => router.push(`/session/${sessionId}`)}
                    onChartMatch={() => {
                        setShowViewModal(false);
                        setShowMatchNotesModal(true);
                    }}
                />
            )}

            {/* Match Notes Modal */}
            {showMatchNotesModal && selectedEvent && (
                <MatchNotesModal
                    matchTitle={selectedEvent.title}
                    initialNotes={selectedEvent.notes || ''}
                    onClose={() => setShowMatchNotesModal(false)}
                    onSave={(notes) => {
                        handleUpdateEvent(selectedEvent.id, { notes });
                        setShowMatchNotesModal(false);
                    }}
                    onOpenChartingTool={() => {
                        setShowMatchNotesModal(false);
                        setShowChartingTool(true);
                    }}
                />
            )}

            {/* Match Charting Tool Modal */}
            {showChartingTool && selectedEvent && (
                <MatchChartingTool
                    matchTitle={selectedEvent.title}
                    onClose={() => setShowChartingTool(false)}
                    // In a real app we'd load existing point data here
                    onSave={(data) => {
                        console.log('Saved charting data:', data);
                        // Save to store logic would go here
                        setShowChartingTool(false);
                    }}
                />
            )}
        </div>
    );
}

function EventModal({ date, sources, onClose, onSave }: {
    date: Date;
    sources: any[];
    onClose: () => void;
    onSave: (data: Partial<CalendarEvent>) => void;
}) {
    const router = useRouter();
    const [view, setView] = useState<'type-select' | 'court-select' | 'player-select' | 'practice-type'>('type-select');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedCourt, setSelectedCourt] = useState('');

    const sessionTypes = [
        {
            type: 'session',
            label: 'Practice',
            description: 'Build drills and exercises',
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-500/20 hover:border-green-500',
            icon: '🎾'
        },
        {
            type: 'match',
            label: 'Match',
            description: 'Official match day',
            color: 'bg-purple-500',
            hoverColor: 'hover:bg-purple-500/20 hover:border-purple-500',
            icon: '🏆'
        },
    ];

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        if (type === 'session') {
            setView('court-select');
        } else {
            setView('player-select');
        }
    };

    const handlePlayerSelect = (sourceId: string) => {
        if (!selectedType) return;

        if (selectedType === 'session') {
            const source = sources.find(s => s.id === sourceId);
            const dateStr = format(date, 'yyyy-MM-dd');

            const courtParam = selectedCourt.trim() ? `&court=${encodeURIComponent(selectedCourt.trim())}` : '';
            if (source?.type === 'team') {
                // Redirect to Team Builder
                router.push(`/team?date=${dateStr}&teamId=${sourceId}${courtParam}`);
            } else {
                // Redirect to Session Builder (Individual)
                router.push(`/builder?date=${dateStr}&type=practice&sourceId=${sourceId}${courtParam}`);
            }

        } else {
            // Match or Match Prep
            const label = sessionTypes.find(t => t.type === selectedType)?.label || 'Session';
            const source = sources.find(s => s.id === sourceId);

            onSave({
                title: source ? `${label} - ${source.name}` : `${label}`,
                type: selectedType as 'match' | 'match-prep' | 'event',
                sourceId: sourceId,
                court: selectedCourt.trim() || undefined
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Create Event</h2>
                        <p className="text-slate-400 text-sm mt-1">{format(date, 'EEEE, MMMM d, yyyy')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-3">
                    {view === 'type-select' ? (
                        <>
                            <p className="text-sm text-slate-400 mb-4">What type of event is this?</p>
                            {sessionTypes.map((sessionType) => (
                                <button
                                    key={sessionType.type}
                                    onClick={() => handleTypeSelect(sessionType.type)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-700/30 transition-all",
                                        sessionType.hoverColor
                                    )}
                                >
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl", sessionType.color + "/20")}>
                                        {sessionType.icon}
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-semibold text-white">{sessionType.label}</div>
                                        <div className="text-sm text-slate-400">{sessionType.description}</div>
                                    </div>
                                    <div className={cn("w-3 h-3 rounded-full", sessionType.color)} />
                                </button>
                            ))}
                        </>
                    ) : view === 'court-select' ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <button onClick={() => setView('type-select')} className="text-slate-400 hover:text-white transition">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <p className="text-sm text-slate-400">Where is the practice?</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Court</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="e.g. C5 or Court 5"
                                    value={selectedCourt}
                                    onChange={e => setSelectedCourt(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') setView('player-select');
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition"
                                />
                            </div>
                            <button 
                                onClick={() => setView('player-select')}
                                className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
                            >
                                Continue
                            </button>
                        </>
                    ) : view === 'player-select' ? (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <button onClick={() => setView(selectedType === 'session' ? 'court-select' : 'type-select')} className="text-slate-400 hover:text-white transition">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <p className="text-lg font-bold text-white tracking-tight">Who is this for?</p>
                            </div>

                            {sources.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-700">
                                    No players or teams found.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[300px]">
                                    {/* Groups Column */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" />
                                            Groups
                                        </h3>
                                        <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                            {sources.filter(s => s.type === 'team').length > 0 ? (
                                                sources.filter(s => s.type === 'team').map((group) => (
                                                    <button
                                                        key={group.id}
                                                        onClick={() => handlePlayerSelect(group.id)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-700/30 hover:bg-slate-700 hover:border-green-500/50 transition-all text-left group"
                                                    >
                                                        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg", group.color)}>
                                                            {group.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="text-sm font-bold text-white truncate flex-1 group-hover:text-green-400 transition-colors">{group.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center bg-slate-900/20 rounded-xl border border-dashed border-slate-700/50">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No Groups</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Players Column */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                            <UserPlus className="w-3.5 h-3.5" />
                                            Players
                                        </h3>
                                        <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                            {sources.filter(s => s.type === 'person').length > 0 ? (
                                                sources.filter(s => s.type === 'person').map((player) => (
                                                    <button
                                                        key={player.id}
                                                        onClick={() => handlePlayerSelect(player.id)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-700/30 hover:bg-slate-700 hover:border-green-500/50 transition-all text-left group"
                                                    >
                                                        {player.imageUrl ? (
                                                            <img src={player.imageUrl} className="w-10 h-10 rounded-full object-cover shadow-lg" alt={player.name} />
                                                        ) : (
                                                            <span className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg", player.color)}>
                                                                {player.initials}
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-bold text-white truncate flex-1 group-hover:text-green-400 transition-colors">{player.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center bg-slate-900/20 rounded-xl border border-dashed border-slate-700/50">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No Players</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function EditEventModal({ event, onClose, onSave }: {
    event: CalendarEvent;
    onClose: () => void;
    onSave: (updates: Partial<CalendarEvent>) => void;
}) {
    const [formData, setFormData] = useState<Partial<CalendarEvent>>({
        title: event.title,
        date: new Date(event.date), // Ensure date object
        time: event.time || '',
        type: event.type,
        court: event.court || '',
        notes: event.notes || '',
    });

    const handleChange = (field: keyof CalendarEvent, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Edit Event</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                            <input
                                type="date"
                                value={format(new Date(formData.date as Date), 'yyyy-MM-dd')}
                                onChange={(e) => handleChange('date', new Date(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Time</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => handleChange('time', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Court</label>
                            <input
                                type="text"
                                placeholder="e.g. Court 5"
                                value={formData.court || ''}
                                onChange={(e) => handleChange('court', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                        >
                            <option value="session">Practice Session</option>
                            <option value="team-session">Team Session</option>
                            <option value="match">Match</option>

                            <option value="event">Event</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition h-24 resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ViewEventModal({ event, onClose, onEdit, onDelete, onDeleteSeries, onViewSession, onChartMatch }: {
    event: CalendarEvent;
    onClose: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
    onDeleteSeries: (groupId: string) => void;
    onViewSession: (sessionId: string) => void;
    onChartMatch: () => void;
}) {
    const router = useRouter();
    const [showDeleteOptions, setShowDeleteOptions] = useState(false);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Find the assigned source name for display
    const assignedSource = dataStore.getCalendarSources().find(s => s.id === event.sourceId);

    const typeColors: Record<string, string> = {
        session: 'bg-green-500/20 text-green-400 border-green-500',
        'team-session': 'bg-blue-500/20 text-blue-400 border-blue-500',
        match: 'bg-purple-500/20 text-purple-400 border-purple-500',

        event: 'bg-slate-500/20 text-slate-400 border-slate-500',
    };

    const typeLabels: Record<string, string> = {
        session: 'Practice Session',
        'team-session': 'Team Session',
        match: 'Match',

        event: 'Event',
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-700 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-white">{event.title}</h2>
                            {event.recurrenceGroupId && (
                                <span className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                                    <Repeat className="w-3 h-3" /> Recurring
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 mt-1 flex items-center flex-wrap gap-2">
                            <span>{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}{event.time && ` at ${event.time}`}</span>
                            {event.court && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-xs font-semibold">
                                    {event.court}
                                </span>
                            )}
                        </p>
                        {assignedSource && assignedSource.id !== 'user' && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">For:</span>
                                <span className={cn("text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1", assignedSource.color + "/20 " + assignedSource.color.replace('bg-', 'text-'))}>
                                    <span className={cn("w-2 h-2 rounded-full", assignedSource.color)} />
                                    {assignedSource.name}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                            title="Edit Event"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                        <div className={`inline-block px-4 py-2 rounded-lg border ${typeColors[event.type] || typeColors.event}`}>
                            {typeLabels[event.type] || 'Event'}
                        </div>
                    </div>

                    {event.type === 'match' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => { onClose(); router.push(`/match/${event.id}`); }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition font-medium shadow-lg shadow-purple-500/20"
                            >
                                <Eye className="w-5 h-5" />
                                Match Dashboard
                            </button>
                            <button
                                onClick={onChartMatch}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
                            >
                                <Trophy className="w-5 h-5" />
                                Chart
                            </button>
                        </div>
                    )}

                    {event.recurrenceDays && event.recurrenceDays.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Repeats on</label>
                            <div className="flex gap-2">
                                {event.recurrenceDays.map(d => (
                                    <span key={d} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                        {dayLabels[d]}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {event.notes && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Notes</label>
                            <p className="text-white bg-slate-700/50 p-4 rounded-lg">{event.notes}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        {event.sessionId && (
                            <button
                                onClick={() => onViewSession(event.sessionId!)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                            >
                                <Eye className="w-4 h-4" />
                                View Session
                            </button>
                        )}

                        {event.recurrenceGroupId ? (
                            showDeleteOptions ? (
                                <div className="flex-1 flex flex-col gap-2">
                                    <button
                                        onClick={() => onDelete(event.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition border border-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete This Event
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete ALL events in this recurring series?')) {
                                                onDeleteSeries(event.recurrenceGroupId!);
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/30 text-red-300 rounded-lg hover:bg-red-600/40 transition border border-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete All in Series
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteOptions(false)}
                                        className="text-sm text-slate-400 hover:text-white transition text-center"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteOptions(true)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition border border-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => {
                                    if (confirm('Delete this event?')) {
                                        onDelete(event.id);
                                    }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition border border-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
