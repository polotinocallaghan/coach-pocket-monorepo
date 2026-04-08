'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Trophy, UserPlus, Users, ChevronRight, Check, PlusCircle, X } from 'lucide-react';
import { dataStore, CalendarSource, CalendarEvent, Team, TeamMember } from '@coach-pocket/core';
import { cn, generateId } from '@/lib/utils';

export default function PlayersPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [players, setPlayers] = useState<CalendarSource[]>([]);
    const [groups, setGroups] = useState<CalendarSource[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

    const fetchPlayers = useCallback(() => {
        const sources = dataStore.getCalendarSources();
        const playerSources = sources.filter(s => s.type === 'person');
        const groupSources = sources.filter(s => s.type === 'team');
        setPlayers(playerSources);
        setGroups(groupSources);
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        // Fetch data on mount
        fetchPlayers();
        const unsub = dataStore.subscribe(fetchPlayers);
        return () => unsub();
    }, [fetchPlayers]);

    const filteredPlayers = useMemo(() => {
        return players.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [players, searchQuery]);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Roster <span className="text-green-400">Management</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Track performance, notes, and progress for your athletes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-green-500/20 font-bold text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Player
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search roster by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all backdrop-blur-md"
                    />
                </div>
                <button className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all backdrop-blur-md">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Players Grid (Left Side) - Takes 3/4 on large screens */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredPlayers.map((player: CalendarSource, index) => {
                                return (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        onClick={() => router.push(`/player/${player.id}`)}
                                        className="group relative bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] p-8 hover:bg-slate-800/60 transition-all cursor-pointer overflow-hidden flex flex-col items-center text-center hover:border-green-500/50"
                                    >
                                        {/* Avatar */}
                                        <div className={cn(
                                            "w-28 h-28 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-all mb-6",
                                            player.color || "bg-gradient-to-br from-green-400 to-emerald-600"
                                        )}>
                                            {player.imageUrl ? (
                                                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-[2rem]" />
                                            ) : (
                                                player.initials || player.name.substring(0, 2).toUpperCase()
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div className="flex flex-col items-center min-w-0 w-full">
                                            <h3 className="text-xl font-black text-white truncate w-full group-hover:text-green-400 transition-colors">
                                                {player.name}
                                            </h3>
                                            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-y-0 translate-y-2">
                                                View Profile
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Add Card */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="border-2 border-dashed border-slate-700 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-slate-500 hover:text-green-400 hover:border-green-500/50 hover:bg-green-500/5 transition-all group cursor-pointer h-full min-h-[250px]"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-green-500 group-hover:text-white transition-all shadow-xl">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Add Athlete</span>
                        </motion.div>
                    </div>

                    {/* Empty State */}
                    {filteredPlayers.length === 0 && searchQuery && (
                        <div className="py-20 text-center bg-slate-800/20 rounded-[3rem] border border-dashed border-slate-700 mt-6">
                            <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">No players found matching "{searchQuery}"</h3>
                            <p className="text-slate-600 mt-1">Try a different name or add a new player to your roster.</p>
                        </div>
                    )}
                </div>

                {/* Groups Column (Right Side) - Takes 1/4 on large screens */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-400" />
                            Groups
                        </h2>
                        <button 
                            onClick={() => setShowCreateGroupModal(true)}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-[2rem] p-6 backdrop-blur-xl space-y-4">
                        {groups.length > 0 ? (
                            groups.map((group) => (
                                <div 
                                    key={group.id}
                                    className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl hover:border-green-500/30 hover:bg-slate-800/50 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg shadow-black/20",
                                            group.color || "bg-indigo-600"
                                        )}>
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">{group.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.1em]">Group Lesson</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors" />
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <Users className="w-10 h-10 text-slate-700 mx-auto mb-3 opacity-20" />
                                <p className="text-xs text-slate-500 font-medium">No groups created yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Group Modal */}
            <AnimatePresence>
                {showCreateGroupModal && (
                    <CreateGroupModal 
                        allPlayers={players}
                        onClose={() => setShowCreateGroupModal(false)}
                        onSave={(newTeam) => {
                            dataStore.addTeam(newTeam);
                            fetchPlayers();
                            setShowCreateGroupModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CreateGroupModal({ allPlayers, onClose, onSave }: { 
    allPlayers: CalendarSource[];
    onClose: () => void; 
    onSave: (team: Team) => void;
}) {
    const [name, setName] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const togglePlayer = (id: string) => {
        setSelectedPlayerIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!name.trim()) return;

        const newTeam: Team = {
            id: generateId(),
            name: name,
            type: 'academy', // Use academy for NCAA or club... let's stick to what it was
            courtCount: 1,
            members: selectedPlayerIds.map(pId => {
                const p = allPlayers.find(ap => ap.id === pId);
                return {
                    id: pId,
                    name: p?.name || 'Unknown',
                    role: 'player'
                };
            })
        };

        onSave(newTeam);
    };

    const filteredPool = allPlayers.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">New <span className="text-green-400">Group</span></h2>
                        <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Setup team or clinic</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3 block">Group Name</label>
                        <input 
                            type="text"
                            placeholder="Varsity Men's Team..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Player Selection */}
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3 block">
                            Add Players ({selectedPlayerIds.length})
                        </label>
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                placeholder="Search existing players..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/30 border border-slate-800/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all"
                            />
                        </div>

                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredPool.map((player) => (
                                <div 
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                        selectedPlayerIds.includes(player.id)
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-slate-800/30 border-transparent hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white", player.color)}>
                                            {player.initials}
                                        </div>
                                        <span className="text-sm font-bold text-white">{player.name}</span>
                                    </div>
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        selectedPlayerIds.includes(player.id)
                                            ? "bg-green-500 border-green-500"
                                            : "border-slate-700"
                                    )}>
                                        {selectedPlayerIds.includes(player.id) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </div>
                            ))}
                            {filteredPool.length === 0 && (
                                <div className="text-center py-6">
                                    <p className="text-slate-600 text-xs italic">No players found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 bg-slate-800/20 flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-4 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all"
                    >
                        Create Group
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
