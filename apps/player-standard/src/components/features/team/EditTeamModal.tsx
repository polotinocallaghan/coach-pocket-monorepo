'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Check, Trash2 } from 'lucide-react';
import { dataStore } from '@coach-pocket/core';
import { cn } from '@/lib/utils';

interface EditTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string | null;
    onTeamUpdated: () => void;
}

export default function EditTeamModal({ isOpen, onClose, teamId, onTeamUpdated }: EditTeamModalProps) {
    const [name, setName] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    const availablePlayers = dataStore.getCalendarSources().filter(s => s.type === 'person');

    useEffect(() => {
        if (isOpen && teamId) {
            const team = dataStore.getTeam(teamId);
            if (team) {
                setName(team.name);
                setSelectedPlayers(team.members.map(m => m.id));
            }
        }
    }, [isOpen, teamId]);

    if (!isOpen || !teamId) return null;

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

        // Get actual player objects for the team members array
        const members = selectedPlayers.map(playerId => {
            const playerSource = availablePlayers.find(p => p.id === playerId);
            return {
                id: playerId,
                name: playerSource?.name || 'Unknown',
                role: 'player' as const
            };
        });

        // Update team in store
        dataStore.updateTeam(teamId, {
            name: name.trim(),
            members,
        });

        // Also update the calendar source name if we synced it
        const sources = dataStore.getCalendarSources();
        const sourceIndex = sources.findIndex(s => s.id === teamId);
        if (sourceIndex !== -1) {
            sources[sourceIndex].name = name.trim();
        }

        onTeamUpdated();
        onClose();
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this team?')) {
            dataStore.deleteTeam(teamId);

            // Optionally remove from calendar sources
            // dataStore.deleteCalendarSource(teamId) // Not explicitly implemented in store but could be added

            onTeamUpdated();
            onClose();
        }
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
                        Edit Team
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="edit-team-form" onSubmit={handleSubmit} className="space-y-6">

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
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex gap-3 shrink-0 items-center justify-between">
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-3 rounded-xl font-medium transition text-red-400 hover:text-white hover:bg-red-500/20 flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Team
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition border border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-team-form"
                            disabled={!name.trim()}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 border border-purple-500/20 transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
