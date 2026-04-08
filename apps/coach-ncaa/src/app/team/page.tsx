'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataStore, Team, TeamMember, Exercise, Session, SessionExercise } from '@coach-pocket/core';
import { generateId, cn } from '@/lib/utils';
import { ArrowLeft, Save, Clock, BookMarked, Search, Plus, Filter, Trash2, Edit, ChevronDown, Star, X, BookOpen, Users, UserPlus, Calendar, Settings, MoreHorizontal, Check, Copy, GripVertical, Download, Printer, Wand2, AlertTriangle, Play, Minus, TrendingUp, TrendingDown, Activity, CheckCircle2, Heart, Zap, Target, ChevronRight, BarChart3 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';

import TeamSessionExecutionView from '@/components/features/session/TeamSessionExecutionView';
import PrintableTeamSession from '@/components/features/team/PrintableTeamSession';
import DrillAnimationModal from '@/components/features/library/DrillAnimationModal';
import { useSuccess } from '@/lib/SuccessContext';

function TeamContent() {
    const router = useRouter();
    const { showSuccess } = useSuccess();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');
    const teamIdParam = searchParams.get('teamId');
    const [teams, setTeams] = useState<Team[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        // Load data on client mount to avoid hydration mismatch
        const allTeams = dataStore.getTeams();
        setTeams(Array.from(new Map(allTeams.map(item => [item.id, item])).values()));

        const allExercises = dataStore.getExercises();
        setExercises(Array.from(new Map(allExercises.map(item => [item.id, item])).values()));

        const allPlayers = dataStore.getCalendarSources().filter(s => s.type === 'person');
        setPlayers(Array.from(new Map(allPlayers.map(item => [item.id, item])).values()));
    }, []);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showPlayerSidebar, setShowPlayerSidebar] = useState(false);
    const [showDrillSidebar, setShowDrillSidebar] = useState(false);
    const [showTimeOptions, setShowTimeOptions] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // New state for modes
    const [activeMode, setActiveMode] = useState<'menu' | 'organize'>('menu');

    // Animation Modal State
    const [animatingDrill, setAnimatingDrill] = useState<Exercise | null>(null);

    // Session Execution State
    const [activeExecutionSession, setActiveExecutionSession] = useState<Session | null>(null);

    useEffect(() => {
        setIsMounted(true);
        console.log('TeamContent: render. activeExecutionSession:', activeExecutionSession);
    }, [activeExecutionSession]);

    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [editingTeam, setEditingTeam] = useState<Team>();

    // Track assignments with persistence
    const [assignments, setAssignments] = useState<Record<string, string[]>>({});
    // Track drill assignments with persistence
    const [drillAssignments, setDrillAssignments] = useState<Record<string, string[]>>({});

    // Track time blocks with persistence
    const [timeBlocks, setTimeBlocks] = useState<string[]>(['14:00-14:30', '14:30-15:00', '15:00-15:30']);
    const [courtCount, setCourtCount] = useState<number>(4);
    // Initialize Team Selection
    useEffect(() => {
        const savedTeamId = localStorage.getItem('team_mode_selected_team');

        if (teamIdParam && teams.find(t => t.id === teamIdParam)) {
            setSelectedTeamId(teamIdParam);
        } else if (savedTeamId && teams.find(t => t.id === savedTeamId)) {
            setSelectedTeamId(savedTeamId);
        } else if (teams.length > 0) {
            setSelectedTeamId(teams[0].id);
        }
    }, [teams, teamIdParam]);

    // Save Selected Team
    useEffect(() => {
        if (selectedTeamId) {
            localStorage.setItem('team_mode_selected_team', selectedTeamId);
        }
    }, [selectedTeamId]);

    // Load state from localStorage on mount or when team changes
    useEffect(() => {
        if (!selectedTeamId) return;

        const savedAssignments = localStorage.getItem(`team_${selectedTeamId}_assignments`);
        const savedDrills = localStorage.getItem(`team_${selectedTeamId}_drills`);
        const savedTimeBlocks = localStorage.getItem(`team_${selectedTeamId}_time_blocks`);
        const savedCourtCount = localStorage.getItem(`team_${selectedTeamId}_court_count`);

        if (savedAssignments) {
            setAssignments(JSON.parse(savedAssignments));
        } else {
            setAssignments({});
        }

        if (savedDrills) {
            setDrillAssignments(JSON.parse(savedDrills));
        } else {
            if (!savedTimeBlocks) {
                setDrillAssignments({
                    'court-1-14:00-14:30': [exercises.find(e => e.title.includes('Crosscourt'))?.id || ''].filter(Boolean),
                    'court-2-14:30-15:00': [exercises.find(e => e.title.includes('Serve'))?.id || ''].filter(Boolean),
                });
            } else {
                setDrillAssignments({});
            }
        }

        if (savedTimeBlocks) {
            setTimeBlocks(JSON.parse(savedTimeBlocks));
        } else {
            setTimeBlocks(['14:00-14:30', '14:30-15:00', '15:00-15:30']);
        }

        if (savedCourtCount) {
            setCourtCount(parseInt(savedCourtCount, 10));
        } else {
            const team = teams.find(t => t.id === selectedTeamId);
            setCourtCount(team?.courtCount || 4);
        }
    }, [exercises, selectedTeamId, teams]);

    // Save assignments whenever they change (Team Scoped)
    useEffect(() => {
        if (selectedTeamId && Object.keys(assignments).length > 0) {
            localStorage.setItem(`team_${selectedTeamId}_assignments`, JSON.stringify(assignments));
        }
    }, [assignments, selectedTeamId]);

    // Save drill assignments whenever they change (Team Scoped)
    useEffect(() => {
        if (selectedTeamId && Object.keys(drillAssignments).length > 0) {
            localStorage.setItem(`team_${selectedTeamId}_drills`, JSON.stringify(drillAssignments));
        }
    }, [drillAssignments, selectedTeamId]);

    // Save time blocks whenever they change (Team Scoped)
    useEffect(() => {
        if (selectedTeamId) {
            localStorage.setItem(`team_${selectedTeamId}_time_blocks`, JSON.stringify(timeBlocks));
        }
    }, [timeBlocks, selectedTeamId]);

    // Save court count whenever it changes (Team Scoped)
    useEffect(() => {
        if (selectedTeamId) {
            localStorage.setItem(`team_${selectedTeamId}_court_count`, courtCount.toString());
        }
    }, [courtCount, selectedTeamId]);

    const addTimeBlock = (position: 'start' | 'end') => {
        if (timeBlocks.length === 0) {
            setTimeBlocks(['14:00-14:30']);
            return;
        }

        if (position === 'start') {
            const firstBlock = timeBlocks[0];
            const [start, end] = firstBlock.split('-');
            const [startH, startM] = start.split(':').map(Number);
            const date = new Date();
            date.setHours(startH, startM, 0, 0);
            date.setMinutes(date.getMinutes() - 30);

            const newStart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const newBlock = `${newStart}-${start}`;
            setTimeBlocks([newBlock, ...timeBlocks]);
        } else {
            const lastBlock = timeBlocks[timeBlocks.length - 1];
            const [start, end] = lastBlock.split('-');
            const [endH, endM] = end.split(':').map(Number);
            const date = new Date();
            date.setHours(endH, endM, 0, 0);

            const newStart = end;
            date.setMinutes(date.getMinutes() + 30);
            const newEnd = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            const newBlock = `${newStart}-${newEnd}`;
            setTimeBlocks([...timeBlocks, newBlock]);
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (source.droppableId === 'drill-library') {
            if (destination.droppableId.startsWith('court-')) {
                setDrillAssignments(prev => {
                    const currentDrills = prev[destination.droppableId] || [];
                    return {
                        ...prev,
                        [destination.droppableId]: [...currentDrills, draggableId]
                    };
                });
            }
            return;
        }

        const newAssignments = { ...assignments };
        const destId = destination.droppableId;

        if (destId.startsWith('court-')) {
            const currentPlayers = newAssignments[destId] || [];
            if (!currentPlayers.includes(draggableId)) {
                newAssignments[destId] = [...currentPlayers, draggableId];
            }
        }

        if (source.droppableId.startsWith('court-')) {
            const sourcePlayers = newAssignments[source.droppableId] || [];
            newAssignments[source.droppableId] = sourcePlayers.filter(id => id !== draggableId);
        }

        setAssignments(newAssignments);
    };

    const removeDrillFromSlot = (slotId: string, drillIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDrillAssignments(prev => {
            const currentDrills = prev[slotId] || [];
            const newDrills = currentDrills.filter((_, idx) => idx !== drillIndex);

            if (newDrills.length === 0) {
                const newAssignments = { ...prev };
                delete newAssignments[slotId];
                return newAssignments;
            }

            return {
                ...prev,
                [slotId]: newDrills
            };
        });
    };

    const removePlayerFromSlot = (slotId: string, playerId: string) => {
        setAssignments(prev => ({
            ...prev,
            [slotId]: (prev[slotId] || []).filter(id => id !== playerId)
        }));
    };

    const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

    const handleCreateTeam = (teamData: Partial<Team>) => {
        const newTeam: Team = {
            id: generateId(),
            name: teamData.name || 'My Team',
            description: teamData.description,
            type: teamData.type || 'academy',
            courtCount: teamData.courtCount || 4,
            members: [],
        };
        dataStore.addTeam(newTeam);
    };

    const handleAssignDrill = (slotId: string) => {
        setActiveSlotId(slotId);
    };

    const handleSelectExercise = (exerciseId: string) => {
        if (!activeSlotId) return;

        setDrillAssignments(prev => {
            const currentDrills = prev[activeSlotId] || [];
            return {
                ...prev,
                [activeSlotId]: [...currentDrills, exerciseId]
            };
        });
        setActiveSlotId(null);
    };

    const handleAutoAssign = () => {
        const newAssignments: Record<string, string[]> = {};

        for (const time of timeBlocks) {
            const availablePool = [...players.map(p => p.id)];
            const slotsForTime: { slotId: string; needed: number }[] = [];
            for (let courtNum = 1; courtNum <= 4; courtNum++) {
                const slotId = `court-${courtNum}-${time}`;
                const drillIds = drillAssignments[slotId] || [];
                if (drillIds.length === 0) {
                    slotsForTime.push({ slotId, needed: 0 });
                    continue;
                }
                const maxNeeded = drillIds.reduce((max, dId) => {
                    const ex = exercises.find(e => e.id === dId);
                    return Math.max(max, ex?.playerCount || 2);
                }, 0);
                slotsForTime.push({ slotId, needed: maxNeeded });
            }

            const sorted = [...slotsForTime].sort((a, b) => b.needed - a.needed);
            for (const slot of sorted) {
                const take = Math.min(slot.needed, availablePool.length);
                newAssignments[slot.slotId] = availablePool.splice(0, take);
            }
        }
        setAssignments(newAssignments);
    };

    const getSlotNeeded = (slotId: string): number => {
        const drillIds = drillAssignments[slotId] || [];
        if (drillIds.length === 0) return 0;
        return drillIds.reduce((max, dId) => {
            const ex = exercises.find(e => e.id === dId);
            return Math.max(max, ex?.playerCount || 2);
        }, 0);
    };

    const handleStartSession = (session: Session) => {
        // alert('Debug: handleStartSession executed');
        console.log('TeamContent: handleStartSession called with session:', session);
        setShowPreviewModal(false);
        setActiveExecutionSession(session);
    };

    const handleCompleteSession = () => {
        setActiveExecutionSession(null);
        router.push('/calendar');
    };

    if (activeExecutionSession) {
        // Prepare exercises with full details for the execution view
        const sessionExercises = activeExecutionSession.exercises.map(ex => {
            const fullExercise = exercises.find(e => e.id === ex.exerciseId);
            return { ...ex, exercise: fullExercise };
        });

        return (
            <TeamSessionExecutionView
                session={activeExecutionSession}
                exercises={sessionExercises}
                onClose={() => setActiveExecutionSession(null)}
                onComplete={handleCompleteSession}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <header className="bg-slate-800/50 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Team Mode</h1>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-slate-400">Multi-court academy management for</p>
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        className="bg-slate-700 text-white text-sm font-bold px-3 py-1 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {teams.map((team, index) => (
                                            <option key={`${team.id}-${index}`} value={team.id}>{team.name}</option>
                                        ))}
                                        {teams.length === 0 && <option value="">No Teams Created</option>}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {activeMode === 'organize' && (
                                <>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all border border-slate-700"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Invite Player
                                    </button>
                                    <button
                                        onClick={() => setShowPreviewModal(true)}
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                                    >
                                        <Save className="w-4 h-4" />
                                        Review & Save
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
                            >
                                <Plus className="w-4 h-4" />
                                New Team
                            </button>
                        </div>
                    </div>
                    {/* Mode Navigation Tabs */}
                    {/* Mode Navigation Tabs (Removed Templates) */}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeMode === 'menu' && (
                    <TeamMissionControl
                        teams={teams}
                        players={players}
                        selectedTeamId={selectedTeamId}
                        setSelectedTeamId={setSelectedTeamId}
                        onBuildSession={() => setActiveMode('organize')}
                        onCreateTeam={() => setShowCreateModal(true)}
                        onEditTeam={(team) => { setEditingTeam(team); setShowCreateModal(true); }}
                        onDeleteTeam={(id) => {
                            if (window.confirm('Delete this team?')) {
                                dataStore.deleteTeam(id);
                                setTeams(prev => prev.filter(t => t.id !== id));
                                if (selectedTeamId === id) setSelectedTeamId('');
                            }
                        }}
                    />
                )}

                {activeMode === 'organize' && isMounted && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Multi-Court Rotation Board</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-400">Courts:</span>
                                    <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700/50">
                                        <button
                                            onClick={() => setCourtCount(Math.max(1, courtCount - 1))}
                                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                            title="Remove a court"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-8 text-center text-white font-medium text-sm">{courtCount}</span>
                                        <button
                                            onClick={() => setCourtCount(Math.min(10, courtCount + 1))}
                                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                            title="Add a court"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6 pb-4">
                                {showDrillSidebar && (
                                    <div className="w-72 bg-slate-800/80 border-r border-slate-700 p-4 animate-in slide-in-from-left duration-200 shrink-0">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-green-400" />
                                                <h3 className="font-bold text-white">Drill Library</h3>
                                            </div>
                                            <button onClick={() => setShowDrillSidebar(false)} className="text-slate-400 hover:text-white">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-slate-400 mb-4 flex justify-between items-center">
                                            <span>Drag to assign</span>
                                            <button onClick={() => router.push('/library')} className="text-blue-400 hover:underline">Manage</button>
                                        </div>

                                        <Droppable droppableId="drill-library" isDropDisabled={true}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className="space-y-3 pr-1 overflow-y-auto max-h-[60vh] custom-scrollbar"
                                                >
                                                    {exercises.map((exercise, idx) => (
                                                        <Draggable key={exercise.id} draggableId={exercise.id} index={idx}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={cn(
                                                                        "group bg-slate-700/50 rounded-xl p-3 hover:bg-slate-700 transition-all cursor-grab active:cursor-grabbing hover:shadow-lg border border-slate-600/50",
                                                                        snapshot.isDragging ? "opacity-50 ring-2 ring-green-500" : ""
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className={cn(
                                                                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                                                                            exercise.category === 'drill' && "bg-blue-500/20 text-blue-400",
                                                                            exercise.category === 'basket' && "bg-purple-500/20 text-purple-400",
                                                                            exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400",
                                                                            exercise.category === 'game' && "bg-green-500/20 text-green-400"
                                                                        )}>
                                                                            {exercise.category}
                                                                        </span>
                                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                            <Clock className="w-3 h-3" />
                                                                            {exercise.duration}m
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onPointerDown={(e) => { e.stopPropagation(); setAnimatingDrill(exercise); }}
                                                                        onClick={(e) => { e.stopPropagation(); setAnimatingDrill(exercise); }}
                                                                        className="text-white font-medium group-hover:text-green-400 transition-colors text-sm text-left w-full mb-1 flex items-center justify-between"
                                                                    >
                                                                        <span className="truncate pr-2">{exercise.title}</span>
                                                                        <Play className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                                                    </button>
                                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                                                            {exercise.difficulty}
                                                                        </span>
                                                                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                                                            {exercise.playerCount}p
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex bg-slate-800 rounded-xl overflow-hidden relative">
                                        {/* Fixed Time Column */}
                                        <div className="w-24 shrink-0 border-r border-slate-700 bg-slate-800 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.3)]">
                                            <div className="h-14 font-bold text-slate-400 flex items-center justify-center border-b border-slate-700">
                                                Time
                                            </div>
                                            <div className="space-y-4 p-4">
                                                {timeBlocks.map((time, idx) => {
                                                    const isTimeActive = Array.from({ length: courtCount }, (_, i) => i + 1).some(cNum => {
                                                        return (drillAssignments[`court-${cNum}-${time}`] || []).length > 0;
                                                    });
                                                    return (
                                                        <div key={time} className={cn(
                                                            "h-[100px] flex flex-col justify-center items-center text-xs font-bold rounded-lg transition-colors relative",
                                                            isTimeActive ? "text-white bg-slate-700/50" : "text-slate-500"
                                                        )}>
                                                            <span>{time.split('-')[0]}</span>
                                                            <span className="text-[10px] opacity-50">to</span>
                                                            <span>{time.split('-')[1]}</span>
                                                            {isTimeActive && (
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-r shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Courts Grid Container */}
                                        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                                            <div
                                                className="flex p-4 gap-4"
                                                style={{ width: `${courtCount * 280}px` }}
                                            >
                                                {/* Courts Columns */}
                                                {Array.from({ length: courtCount }, (_, i) => i + 1).map(courtNum => (
                                                    <div key={courtNum} className="w-[280px] shrink-0">
                                                        <div className="h-10 mb-4 flex items-center justify-center bg-slate-700/50 rounded-lg">
                                                            <h3 className="text-sm font-bold text-white tracking-wide">COURT {courtNum}</h3>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {timeBlocks.map((time, idx) => {
                                                                const isTimeActive = Array.from({ length: courtCount }, (_, j) => j + 1).some(cNum => {
                                                                    return (drillAssignments[`court-${cNum}-${time}`] || []).length > 0;
                                                                });

                                                                const slotId = `court-${courtNum}-${time}`;
                                                                const slotPlayers = assignments[slotId] || [];
                                                                const assignedDrillIds = drillAssignments[slotId] || [];
                                                                const assignedDrills = assignedDrillIds
                                                                    .map(id => exercises.find(e => e.id === id))
                                                                    .filter((e): e is Exercise => !!e);

                                                                const needed = getSlotNeeded(slotId);
                                                                const assigned = slotPlayers.length;
                                                                const hasDeficit = needed > 0 && assigned < needed;
                                                                const hasSurplus = needed > 0 && assigned > needed;
                                                                const isCompletelyEmpty = assignedDrills.length === 0;

                                                                return (
                                                                    <Droppable key={slotId} droppableId={slotId}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.droppableProps}
                                                                                className={cn(
                                                                                    "bg-slate-700/30 rounded-lg p-3 min-h-[100px] transition-all border-2",
                                                                                    snapshot.isDraggingOver ? "bg-slate-600 border-green-500/50 border-solid ring-2 ring-green-500/50" : "border-transparent",
                                                                                    !snapshot.isDraggingOver && hasDeficit && "border-orange-500/50 border-dashed shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-slate-700/50",
                                                                                    !snapshot.isDraggingOver && isCompletelyEmpty && isTimeActive && "border-red-500/40 border-dashed animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-slate-700/50",
                                                                                    !isCompletelyEmpty && "bg-slate-700/60"
                                                                                )}
                                                                            >
                                                                                {isCompletelyEmpty && isTimeActive && (
                                                                                    <div className="text-[10px] text-red-400/80 font-bold bg-red-400/10 px-1.5 py-0.5 rounded animate-pulse w-fit mb-2">Empty Court</div>
                                                                                )}

                                                                                <div className="space-y-1 mb-2">
                                                                                    {assignedDrills.map((drill, drillIdx) => (
                                                                                        <div key={`${drill.id}-${drillIdx}`} className={cn(
                                                                                            "text-xs font-medium p-1.5 rounded flex items-center justify-between group/drill",
                                                                                            drill.category === 'drill' && "bg-blue-500/20 text-blue-300",
                                                                                            drill.category === 'basket' && "bg-purple-500/20 text-purple-300",
                                                                                            drill.category === 'points' && "bg-yellow-500/20 text-yellow-300",
                                                                                            drill.category === 'game' && "bg-green-500/20 text-green-300"
                                                                                        )}>
                                                                                            <span className="truncate">{drill.title}</span>
                                                                                            <span className="text-[10px] opacity-60 shrink-0">({drill.playerCount}p)</span>
                                                                                            <button
                                                                                                onClick={(e) => removeDrillFromSlot(slotId, drillIdx, e)}
                                                                                                className="opacity-0 group-hover/drill:opacity-100 hover:text-white transition-opacity ml-1"
                                                                                            >
                                                                                                <X className="w-3 h-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                    {assignedDrills.length === 0 && (
                                                                                        <button
                                                                                            onClick={() => handleAssignDrill(slotId)}
                                                                                            className="w-full text-xs text-slate-500 italic hover:text-blue-400 hover:bg-blue-500/10 py-2 rounded transition flex items-center justify-center gap-1"
                                                                                        >
                                                                                            <Plus className="w-3 h-3" />
                                                                                            Add Exercise
                                                                                        </button>
                                                                                    )}
                                                                                    {assignedDrills.length > 0 && (
                                                                                        <button
                                                                                            onClick={() => handleAssignDrill(slotId)}
                                                                                            className="w-full mt-1 text-[10px] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 py-1 rounded transition flex items-center justify-center gap-1"
                                                                                        >
                                                                                            <Plus className="w-3 h-3" />
                                                                                            Add Another
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                <>
                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                        {slotPlayers.map((playerId, playerIdx) => {
                                                                                            const player = players.find(p => p.id === playerId);
                                                                                            if (!player) return null;
                                                                                            const isSurplus = hasSurplus && playerIdx >= needed;

                                                                                            return (
                                                                                                <Draggable key={`${slotId}-${playerId}`} draggableId={playerId} index={playerIdx}>
                                                                                                    {(provided) => (
                                                                                                        <div
                                                                                                            ref={provided.innerRef}
                                                                                                            {...provided.draggableProps}
                                                                                                            {...provided.dragHandleProps}
                                                                                                            className={cn(
                                                                                                                "text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm",
                                                                                                                isSurplus
                                                                                                                    ? "bg-slate-500/40 text-slate-300 border border-dashed border-slate-500"
                                                                                                                    : cn(player.color.replace('bg-', 'bg-').replace('500', '500/80'), "text-white")
                                                                                                            )}
                                                                                                        >
                                                                                                            <span>{player.name.split(' ')[0]}</span>
                                                                                                            {isSurplus && <span className="text-[9px] opacity-60">⬇</span>}
                                                                                                            <button
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    removePlayerFromSlot(slotId, playerId);
                                                                                                                }}
                                                                                                                className="hover:text-red-200"
                                                                                                            >
                                                                                                                <X className="w-3 h-3" />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </Draggable>
                                                                                            );
                                                                                        })}
                                                                                    </div>

                                                                                    {hasDeficit && (
                                                                                        <div
                                                                                            onClick={() => setShowPlayerSidebar(true)}
                                                                                            className="mt-1.5 flex items-center justify-between text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 cursor-pointer px-2 py-1 rounded transition-colors"
                                                                                        >
                                                                                            <div className="flex items-center gap-1">
                                                                                                <AlertTriangle className="w-3 h-3" />
                                                                                                <span className="text-[11px] font-bold">
                                                                                                    Need Players
                                                                                                </span>
                                                                                            </div>
                                                                                            <span className="text-[11px] font-bold">
                                                                                                {assigned}/{needed}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            </div>
                                                                        )}
                                                                    </Droppable>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {showPlayerSidebar && (
                                    <div className="w-64 bg-slate-700/30 border-l border-slate-700 p-4 animate-in slide-in-from-right duration-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-white">Players</h3>
                                            <button onClick={() => setShowPlayerSidebar(false)} className="text-slate-400 hover:text-white">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <Droppable droppableId="player-list" isDropDisabled={true}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className="space-y-2"
                                                >
                                                    {players.map((player, index) => (
                                                        <Draggable key={player.id} draggableId={player.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={cn(
                                                                        "flex items-center gap-3 p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-grab active:cursor-grabbing border border-slate-700",
                                                                        snapshot.isDragging ? "opacity-50" : ""
                                                                    )}
                                                                >
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${player.color}`}>
                                                                        {player.initials}
                                                                    </div>
                                                                    <span className="text-sm text-slate-200 font-medium">{player.name}</span>
                                                                    <GripVertical className="w-4 h-4 text-slate-500 ml-auto" />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-4">
                                <button
                                    className={cn(
                                        "px-4 py-2 rounded-lg transition border font-semibold flex items-center gap-2",
                                        showDrillSidebar
                                            ? "bg-green-500 text-white border-green-500"
                                            : "bg-green-500/20 text-green-400 border-transparent hover:bg-green-500/30"
                                    )}
                                    onClick={() => setShowDrillSidebar(!showDrillSidebar)}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    {showDrillSidebar ? 'Hide Drills' : 'Assign Drill'}
                                </button>
                                <button
                                    onClick={handleAutoAssign}
                                    className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition flex items-center gap-2 font-semibold"
                                >
                                    <Wand2 className="w-4 h-4" />
                                    Auto-Assign Players
                                </button>
                                <button
                                    className={cn(
                                        "px-4 py-2 rounded-lg transition border",
                                        showPlayerSidebar
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "bg-blue-500/20 text-blue-400 border-transparent hover:bg-blue-500/30"
                                    )}
                                    onClick={() => setShowPlayerSidebar(!showPlayerSidebar)}
                                >
                                    {showPlayerSidebar ? 'Hide Players' : 'Assign Players'}
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTimeOptions(!showTimeOptions)}
                                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Time Block
                                    </button>

                                    {showTimeOptions && (
                                        <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 w-48 z-10 animate-in fade-in zoom-in-50 duration-200">
                                            <button
                                                onClick={() => {
                                                    addTimeBlock('start');
                                                    setShowTimeOptions(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition"
                                            >
                                                Add to Start
                                            </button>
                                            <button
                                                onClick={() => {
                                                    addTimeBlock('end');
                                                    setShowTimeOptions(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition"
                                            >
                                                Add to End
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                    </DragDropContext>
                )}

                {activeMode === 'organize' && !isMounted && (
                    <div className="flex items-center justify-center p-12 text-slate-400">
                        Loading board...
                    </div>
                )}

                {/* teams list is now inside TeamMissionControl */}
            </div>

            {showCreateModal && (
                <TeamModal
                    initialData={editingTeam}
                    availablePlayers={players}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingTeam(undefined);
                    }}
                    onSave={(data) => {
                        if (editingTeam) {
                            dataStore.updateTeam(editingTeam.id, data);
                            setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, ...data } : t));
                        } else {
                            handleCreateTeam(data);
                            // Refresh teams list
                            setTeams(Array.from(new Map(dataStore.getTeams().map(item => [item.id, item])).values()));
                        }
                        setShowCreateModal(false);
                        setEditingTeam(undefined);
                    }}
                />
            )}

            {showPreviewModal && (
                <TeamSessionPreviewModal
                    onClose={() => setShowPreviewModal(false)}
                    exercises={exercises}
                    assignments={assignments}
                    drillAssignments={drillAssignments}
                    players={players}
                    timeBlocks={timeBlocks}
                    date={dateParam}
                    onStart={handleStartSession}
                    teamName={teams.find(t => t.id === selectedTeamId)?.name || 'My Team'}
                />
            )}

            <DrillAnimationModal
                isOpen={!!animatingDrill}
                onClose={() => setAnimatingDrill(null)}
                drill={animatingDrill}
            />

            {activeSlotId && (
                <ExercisePickerModal
                    exercises={exercises}
                    onClose={() => setActiveSlotId(null)}
                    onSelect={handleSelectExercise}
                />
            )}
        </div>
    );
}




// ─── HEALTH STATUS TYPES ────────────────────────────────────────────────────
type HealthStatus = 'full' | 'limited' | 'out';
const healthConfig: Record<HealthStatus, { label: string; color: string; dot: string }> = {
    full:    { label: 'Full',    color: 'text-green-400',  dot: 'bg-green-400' },
    limited: { label: 'Limited', color: 'text-yellow-400', dot: 'bg-yellow-400' },
    out:     { label: 'Out',     color: 'text-red-400',    dot: 'bg-red-400' },
};

// ─── SPARKLINE ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#22c55e' }: { data: number[]; color?: string }) {
    const max = Math.max(...data, 1);
    const w = 56, h = 24;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - (data[data.length - 1] / max) * h} r="2.5" fill={color} />
        </svg>
    );
}

// ─── BAR CHART ──────────────────────────────────────────────────────────────
function TrainingVolumeChart({ days }: { days: { label: string; hours: number; type: string }[] }) {
    const max = Math.max(...days.map(d => d.hours), 1);
    const typeColors: Record<string, string> = {
        Tactical:  'bg-blue-500',
        Technical: 'bg-purple-500',
        Physical:  'bg-green-500',
        Mixed:     'bg-teal-500',
        Rest:      'bg-slate-600',
    };
    return (
        <div className="flex items-end gap-1.5 h-24 w-full">
            {days.map((d, i) => (
                <motion.div
                    key={d.label}
                    className="flex-1 flex flex-col items-center gap-1"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
                    style={{ transformOrigin: 'bottom' }}
                >
                    <div
                        className={cn('w-full rounded-t-md transition-all', typeColors[d.type] || 'bg-slate-500')}
                        style={{ height: `${(d.hours / max) * 80}px`, minHeight: d.hours > 0 ? '4px' : '0' }}
                        title={`${d.label}: ${d.hours}h ${d.type}`}
                    />
                    <span className="text-[9px] text-slate-500 font-medium">{d.label}</span>
                </motion.div>
            ))}
        </div>
    );
}

// ─── MISSION CONTROL ────────────────────────────────────────────────────────
function TeamMissionControl({
    teams, players, selectedTeamId, setSelectedTeamId,
    onBuildSession, onCreateTeam, onEditTeam, onDeleteTeam,
}: {
    teams: Team[];
    players: any[];
    selectedTeamId: string;
    setSelectedTeamId: (id: string) => void;
    onBuildSession: () => void;
    onCreateTeam: () => void;
    onEditTeam: (team: Team) => void;
    onDeleteTeam: (id: string) => void;
}) {
    const router = useRouter();
    const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

    // Derived KPIs (computed from real data where possible, otherwise plausible stubs)
    const rosterCount = activeTeam?.members?.length ?? players.length;

    // Simulate weekly volume from sessions in store
    const allEvents = dataStore.getCalendarEvents();
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);
    const weekEvents = allEvents.filter(e => new Date(e.date) >= weekStart && new Date(e.date) <= now);
    const totalHoursThisWeek = weekEvents.length * 1.5; // assume 90min each
    const totalHoursLastWeek = (allEvents.filter(e => {
        const d = new Date(e.date);
        const ls = new Date(weekStart); ls.setDate(ls.getDate() - 7);
        return d >= ls && d < weekStart;
    }).length) * 1.5;
    const volumeTrend = totalHoursLastWeek > 0 ? ((totalHoursThisWeek - totalHoursLastWeek) / totalHoursLastWeek * 100).toFixed(0) : null;

    // Bar chart data – last 7 days
    const chartDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
        const dayEvents = allEvents.filter(e => {
            const ed = new Date(e.date);
            return ed.toDateString() === d.toDateString();
        });
        const types = ['Tactical', 'Technical', 'Physical', 'Mixed'];
        return {
            label,
            hours: +(dayEvents.length * 1.5).toFixed(1),
            type: dayEvents.length > 0 ? types[i % types.length] : 'Rest',
        };
    });

    // Player health – randomly seeded per player (stable per player id hash)
    const statuses: HealthStatus[] = ['full', 'full', 'full', 'limited', 'out'];
    const getStatus = (id: string): HealthStatus => statuses[id.charCodeAt(0) % statuses.length];

    // Workload sparkline per player (seeded)
    const getSparkline = (id: string) => Array.from({ length: 6 }, (_, i) => {
        const base = (id.charCodeAt(0) + i * 3) % 10;
        return Math.max(1, base);
    });

    return (
        <div className="space-y-5">
            {/* ── HEADER ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-3xl font-black text-white">
                            {activeTeam ? activeTeam.name : 'No Team'}
                        </h2>
                        {activeTeam && (
                            <span className="bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                ● ACTIVE
                            </span>
                        )}
                        {teams.length > 1 && (
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 ml-1"
                            >
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                        {activeTeam ? `${activeTeam.type} · ${activeTeam.courtCount} courts` : 'Create a team to get started'}
                    </p>
                </div>

            </div>

            {/* ── MAIN BODY: Two Columns ────────────────────── */}
            <div className="flex gap-5 items-start">

                {/* LEFT — Player Roster (Hero) */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                        Roster · {(activeTeam?.members?.length > 0 ? activeTeam.members : players).length} players
                    </h3>

                    {(activeTeam?.members?.length > 0 || players.length > 0) ? (
                        <div className="space-y-2">
                            {(activeTeam?.members?.length > 0 ? activeTeam.members : players).map((member: any, i: number) => {
                                const status = getStatus(member.id);
                                const cfg = healthConfig[status];
                                const spark = getSparkline(member.id);
                                const name: string = member.name || member.playerName || 'Player';
                                const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                return (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="group flex items-center gap-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600/60 rounded-xl px-4 py-3 transition-all cursor-default relative"
                                    >
                                        {/* Status stripe */}
                                        <div className={cn('absolute left-0 top-3 bottom-3 w-0.5 rounded-r', cfg.dot)} />

                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-black text-sm shadow flex-shrink-0 ml-1">
                                            {initials}
                                        </div>

                                        {/* Name + status */}
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold text-white text-sm">{name}</span>
                                            <div className={cn('text-[11px] font-medium mt-0.5', cfg.color)}>{cfg.label}</div>
                                        </div>



                                        {/* Hover quick action */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button
                                                onClick={() => router.push(`/player/${member.id}`)}
                                                className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-semibold transition"
                                            >
                                                <Activity className="w-3 h-3" /> Profile
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
                            <p className="text-sm">No players in roster yet</p>
                            <p className="text-xs mt-1 text-slate-600">Add players to a team from the Profile dashboard</p>
                        </div>
                    )}
                </div>

                {/* RIGHT — Action Sidebar */}
                <div className="w-64 flex-shrink-0 space-y-4">

                    {/* Primary CTA */}
                    <motion.button
                        onClick={onBuildSession}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl px-4 py-3.5 flex items-center justify-between font-bold text-sm shadow-lg shadow-green-500/20 transition-all group"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Target className="w-4 h-4" />
                            </div>
                            <span className="leading-tight text-left">Build Today's Practice</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    </motion.button>

                    {/* Mini Volume Chart */}
                    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume · 7 days</span>
                        </div>
                        <TrainingVolumeChart days={chartDays} />
                        {weekEvents.length === 0 && (
                            <p className="text-[10px] text-slate-600 italic text-center mt-1">No sessions logged</p>
                        )}
                        <div className="flex gap-2 mt-2.5 flex-wrap">
                            {['Tactical','Technical','Physical'].map((t,i) => (
                                <span key={t} className={cn('flex items-center gap-1 text-[9px] font-semibold', ['text-blue-400','text-purple-400','text-green-400'][i])}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', ['bg-blue-500','bg-purple-500','bg-green-500'][i])} />
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
}


function TeamModal({ initialData, availablePlayers, onClose, onSave }: {
    initialData?: Team;
    availablePlayers: any[];
    onClose: () => void;
    onSave: (data: Partial<Team>) => void;
}) {

    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        type: 'academy', // Default values are kept for data integrity but hidden from user
        courtCount: 4,
        members: [],
    });

    const [memberSearch, setMemberSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                courtCount: initialData.courtCount,
                members: initialData.members || [],
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const addMember = (player: any) => {
        if (formData.members?.some(m => m.id === player.id)) return;

        const newMember: TeamMember = {
            id: player.id,
            name: player.name,
            role: 'player',
            level: 'Intermediate' // Default level
        };

        setFormData(prev => ({
            ...prev,
            members: [...(prev.members || []), newMember]
        }));
        setMemberSearch('');
        setIsDropdownOpen(false);
    };

    const removeMember = (memberId: string) => {
        setFormData(prev => ({
            ...prev,
            members: (prev.members || []).filter(m => m.id !== memberId)
        }));
    };

    const filteredPlayers = availablePlayers.filter(p =>
        p.name.toLowerCase().includes(memberSearch.toLowerCase()) &&
        !formData.members?.some(m => m.id === p.id)
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">
                        {initialData ? 'Edit Team' : 'Create New Team'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Team Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Elite Tennis Academy"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Add Players</label>
                        <div className="relative">
                            <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-green-500 transition-colors">
                                <Search className="w-4 h-4 text-slate-400 mr-2" />
                                <input
                                    type="text"
                                    value={memberSearch}
                                    onChange={(e) => {
                                        setMemberSearch(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    placeholder="Search players..."
                                    className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-slate-500"
                                />
                            </div>

                            {isDropdownOpen && (memberSearch || filteredPlayers.length > 0) && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsDropdownOpen(false)}
                                    />
                                    <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                        {filteredPlayers.length > 0 ? (
                                            filteredPlayers.map(player => (
                                                <button
                                                    key={player.id}
                                                    type="button"
                                                    onClick={() => addMember(player)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-700/50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${player.color} text-white`}>
                                                            {player.initials}
                                                        </div>
                                                        <span className="text-slate-200 group-hover:text-white">{player.name}</span>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-green-500" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-slate-500 text-sm">
                                                No players found
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Selected Members List */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Team Roster ({formData.members?.length || 0})
                        </label>

                        {formData.members && formData.members.length > 0 ? (
                            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                                {formData.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">{member.name}</div>
                                                <div className="text-xs text-slate-500 capitalize">{member.role}</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeMember(member.id)}
                                            className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No players added yet</p>
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-6 border-t border-slate-700 flex gap-4 bg-slate-800 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit} // Submit form explicitly
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                    >
                        {initialData ? 'Save Changes' : 'Create Team'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExercisePickerModal({ exercises, onClose, onSelect }: {
    exercises: Exercise[];
    onClose: () => void;
    onSelect: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = exercises.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Select Exercise</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search exercises..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(exercise => (
                        <button
                            key={exercise.id}
                            onClick={() => onSelect(exercise.id)}
                            className="text-left bg-slate-700/50 p-4 rounded-xl hover:bg-slate-700 hover:ring-2 hover:ring-blue-500 transition group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-semibold",
                                    exercise.category === 'drill' && "bg-blue-500/20 text-blue-400",
                                    exercise.category === 'basket' && "bg-purple-500/20 text-purple-400",
                                    exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400",
                                    exercise.category === 'game' && "bg-green-500/20 text-green-400"
                                )}>
                                    {exercise.category}
                                </span>
                                <span className="text-xs text-slate-500 group-hover:text-slate-300">{exercise.playerCount}p</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">{exercise.title}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2">{exercise.description}</p>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            No exercises found matching "{search}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TeamSessionPreviewModal({ onClose, exercises, assignments, drillAssignments, players, timeBlocks, date, onStart, teamName }: {
    onClose: () => void;
    exercises: Exercise[];
    assignments: Record<string, string[]>;
    drillAssignments: Record<string, string[]>;
    players: any[];
    timeBlocks: string[];
    date: string | null;
    onStart: (session: Session) => void;
    teamName: string;
}) {
    const router = useRouter();
    const { showSuccess } = useSuccess();
    const [sessionTitle, setSessionTitle] = useState('Team Training Session');

    const handleSave = (isTemplate: boolean, startNow: boolean = false) => {
        try {
            console.log('handleSave called. template:', isTemplate, 'startNow:', startNow);

            // Create full session object
            const blocks: SessionExercise[] = [];

            timeBlocks.forEach((time, index) => {
                // Iterate through each court to preserve assignment details
                for (let c = 1; c <= 4; c++) {
                    const slotId = `court-${c}-${time}`;
                    const drillIds = drillAssignments[slotId] || [];

                    drillIds.forEach(drillId => {
                        const exercise = exercises.find(e => e.id === drillId);
                        if (exercise) {
                            blocks.push({
                                ...exercise,
                                id: generateId(), // generateId is imported from utils
                                exerciseId: exercise.id,
                                block: (exercise.category as any) || 'technical',
                                order: blocks.length + 1,
                                duration: 30, // Default slot duration
                                notes: `Court ${c} - ${time}`,
                                courtId: `court-${c}`,
                                timeSlot: time
                            });
                        }
                    });
                }
            });

            const newSession: Session = {
                id: generateId(),
                title: sessionTitle,
                description: `Team session with ${timeBlocks.length} time blocks on ${date || 'today'}`,
                exercises: blocks.length > 0 ? blocks : [],
                createdAt: new Date(),
                type: 'team',
                teamId: 'team-1', // Default to Division 2 Men for now
                isTemplate: isTemplate
            };

            console.log('Session constructed:', newSession);

            dataStore.addSession(newSession);

            if (startNow) {
                alert('Debug: Start Now clicked');
                console.log('TeamSessionPreviewModal: Starting session now...', newSession);
                if (onStart) {
                    alert('Debug: Calling onStart');
                    onStart(newSession);
                } else {
                    alert('Debug: Error - onStart prop is missing!');
                    console.error('TeamSessionPreviewModal: onStart prop is missing!');
                }
                return;
            }

            // Create Calendar Event if saving as a real session (not template)
            if (!isTemplate) {
                const eventDate = date ? new Date(date) : new Date();
                // Use first time block as start time if available
                const startTime = timeBlocks.length > 0 ? timeBlocks[0].split('-')[0] : '10:00';

                dataStore.addCalendarEvent({
                    id: generateId(),
                    title: sessionTitle || 'Team Session',
                    date: eventDate,
                    time: startTime,
                    type: 'team-session',
                    sessionId: newSession.id,
                    completed: false,
                });
            }

            if (isTemplate) {
                showSuccess('Team Template Saved successfully!', '/');
            } else {
                showSuccess('Team Session Saved successfully!', '/calendar');
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
            alert(`Error saving session: ${error}`);
        }
    };

    // Calculate stats
    const totalCourtsUsed = 4; // fixed for now
    const totalPlayersAssigned = new Set(Object.values(assignments).flat()).size;
    const uniqueDrillsUsed = new Set(Object.values(drillAssignments).flat()).size;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Save Team Session</h2>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Session Title</label>
                        <input
                            type="text"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-700/50 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-blue-400 mb-1">{timeBlocks.length}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Rotation Blocks</div>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-green-400 mb-1">{totalPlayersAssigned}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Players</div>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-purple-400 mb-1">{uniqueDrillsUsed}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Unique Drills</div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                        <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
                            <BookMarked className="w-4 h-4 text-slate-400" />
                            Session Summary
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {timeBlocks.map((time, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                                    <span className="font-mono text-slate-400 mt-0.5">{time}</span>
                                    <div className="flex-1">
                                        {[1, 2, 3, 4].map(c => {
                                            const slotId = `court-${c}-${time}`;
                                            const drills = (drillAssignments[slotId] || []).map(d => exercises.find(e => e.id === d)?.title).join(', ');
                                            if (!drills) return null;
                                            return (
                                                <div key={c} className="flex gap-2 mb-0.5">
                                                    <span className="text-slate-500 w-12">Court {c}:</span>
                                                    <span className="text-slate-300">{drills}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white transition"
                        >
                            Cancel
                        </button>
                        <div className="flex-1 flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    window.print();
                                }}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print Plan
                            </button>
                            <button
                                onClick={() => handleSave(true)}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                            >
                                Save as Template
                            </button>
                            <button
                                onClick={() => handleSave(false)}
                                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold"
                            >
                                Save to Calendar
                            </button>
                            <button
                                onClick={() => {
                                    handleSave(false, true);
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg shadow-blue-500/20"
                            >
                                <Play className="w-4 h-4 inline-block mr-2" />
                                START NOW !!!
                            </button>
                        </div>
                    </div>
                </div>

                <PrintableTeamSession
                    title={sessionTitle}
                    teamName={teamName}
                    date={date || new Date().toLocaleDateString()}
                    timeBlocks={timeBlocks}
                    assignments={assignments}
                    drillAssignments={drillAssignments}
                    exercises={exercises}
                    players={players}
                />
            </div>
        </div>
    );
}

export default function TeamModePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading Team Planner...</div>}>
            <TeamContent />
        </Suspense>
    );
}
