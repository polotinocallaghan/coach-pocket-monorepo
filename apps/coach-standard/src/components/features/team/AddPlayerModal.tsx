'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, User, Info } from 'lucide-react';
import { dataStore, Team } from '@coach-pocket/core';
import { useSuccess } from '@/lib/SuccessContext';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlayerAdded: () => void;
}

export default function AddPlayerModal({ isOpen, onClose, onPlayerAdded }: AddPlayerModalProps) {
    const [name, setName] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const { showSuccess } = useSuccess();

    if (!isOpen) return null;

    const teams = dataStore.getTeams();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) return;

        // Generate a new player ID and initials
        const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);

        // Handle Team/Group Assignment
        if (selectedTeamId) {
            const team = dataStore.getTeam(selectedTeamId);
            if (team) {
                const updatedMembers = [...team.members, {
                    id: newPlayerId,
                    name: name.trim(),
                    role: 'player' as const
                }];
                dataStore.updateTeam(selectedTeamId, { members: updatedMembers });
            }
        } else {
            // If no group is selected, find or create a default "Club Roster" group
            // so they still show up in the player list (which derives from groups)
            const allTeams = dataStore.getTeams();
            let rosterGroup = allTeams.find(t => t.name.toLowerCase() === 'club roster' || t.name.toLowerCase() === 'roster');
            
            if (!rosterGroup) {
                const newGroupId = `roster_${Date.now()}`;
                rosterGroup = {
                    id: newGroupId,
                    name: 'Club Roster',
                    type: 'club',
                    courtCount: 1,
                    members: []
                };
                dataStore.addTeam(rosterGroup);
            }

            const updatedMembers = [...rosterGroup.members, {
                id: newPlayerId,
                name: name.trim(),
                role: 'player' as const
            }];
            dataStore.updateTeam(rosterGroup.id, { members: updatedMembers });
        }

        // Clean up and close
        setName('');
        setSelectedTeamId('');
        showSuccess(`Added ${name.trim()} successfully!`, null);
        onPlayerAdded();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-green-500" />
                        Add New Player
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Name Input */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                Player Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="E.g. Roger Federer"
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-slate-600 font-medium"
                                required
                            />
                        </div>

                        {/* Team Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                Assign to Group (Optional)
                            </label>

                            {teams.length > 0 ? (
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium appearance-none"
                                >
                                    <option value="">Select a group...</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.type})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-xs text-slate-500 bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-start gap-2">
                                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    No groups available. You can assign them to a group later.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition. border border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 border border-green-500/20 transition-all"
                        >
                            Add Player
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
