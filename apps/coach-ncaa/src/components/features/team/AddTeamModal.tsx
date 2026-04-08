'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Check, Building, LayoutGrid } from 'lucide-react';
import { dataStore } from '@coach-pocket/core';
import { cn } from '@/lib/utils';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTeamAdded: () => void;
}

export default function AddTeamModal({ isOpen, onClose, onTeamAdded }: AddTeamModalProps) {
    const [name, setName] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    if (!isOpen) return null;

    const availablePlayers = dataStore.getCalendarSources().filter(s => s.type === 'person');

    const togglePlayerSelection = (playerId: string) => {
        setSelectedPlayers(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) return;

        // Generate a new team ID
        const newTeamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        // Get actual player objects for the team members array
        const members = selectedPlayers.map(playerId => {
            const playerSource = availablePlayers.find(p => p.id === playerId);
            return {
                id: playerId,
                name: playerSource?.name || 'Unknown',
                role: 'player' as const
            };
        });

        // Add to teams store
        dataStore.addTeam({
            id: newTeamId,
            name: name.trim(),
            type: 'club', // default value
            courtCount: 1, // default value
            members,
        });



        // Clean up and close
        setName('');
        setSelectedPlayers([]);
        onTeamAdded();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        Create New Team
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="add-team-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                Team Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="E.g. Division 1 Varsity"
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                required
                            />
                        </div>

                        {/* Player Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                Assign Players ({selectedPlayers.length} selected)
                            </label>

                            <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                {availablePlayers.length > 0 ? (
                                    <div className="divide-y divide-slate-800">
                                        {availablePlayers.map(player => (
                                            <button
                                                key={player.id}
                                                type="button"
                                                onClick={() => togglePlayerSelection(player.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors text-left",
                                                    selectedPlayers.includes(player.id) && "bg-slate-800/80"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                                                        style={{ backgroundColor: player.color || '#10b981' }}
                                                    >
                                                        {player.initials || player.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-slate-200">{player.name}</span>
                                                </div>

                                                <div className={cn(
                                                    "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                                                    selectedPlayers.includes(player.id)
                                                        ? "bg-purple-500 border-purple-500 text-white"
                                                        : "border-slate-500 bg-transparent"
                                                )}>
                                                    {selectedPlayers.includes(player.id) && <Check className="w-3 h-3" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-slate-500 text-sm">
                                        No players available. Add players from the Players tab first.
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-team-form"
                        disabled={!name.trim()}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 border border-purple-500/20 transition-all"
                    >
                        Create Team
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
