import React, { useState, useEffect } from 'react';
import { dataStore } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { X, Check, Users, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceModalProps {
    teamId: string;
    initialAttendance?: { memberId: string; present: boolean }[];
    onSave: (attendance: { memberId: string; present: boolean }[]) => void;
    onCancel: () => void;
    onUpdateTeam?: (teamId: string) => void;
}

export default function AttendanceModal({ teamId, initialAttendance, onSave, onCancel, onUpdateTeam }: AttendanceModalProps) {
    const team = useDataStore(() => dataStore.getTeam(teamId));
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (team) {
            const initial: Record<string, boolean> = {};
            team.members.forEach(member => {
                // If initialAttendance is provided, use it. Otherwise default to ALL present.
                const record = initialAttendance?.find(r => r.memberId === member.id);
                initial[member.id] = record ? record.present : true;
            });
            setAttendance(initial);
        }
    }, [team, initialAttendance]);

    // ... (rest of methods)
    const toggleMember = (memberId: string) => {
        setAttendance(prev => ({
            ...prev,
            [memberId]: !prev[memberId]
        }));
    };

    const toggleAll = () => {
        const allPresent = Object.values(attendance).every(v => v);
        const newAttendance: Record<string, boolean> = {};
        if (team) {
            team.members.forEach(member => {
                newAttendance[member.id] = !allPresent;
            });
        }
        setAttendance(newAttendance);
    };

    const handleSave = () => {
        const finalAttendance = Object.entries(attendance).map(([memberId, present]) => ({
            memberId,
            present
        }));
        onSave(finalAttendance);
    };

    if (!team) {
        const allTeams = dataStore.getTeams();

        if (allTeams.length > 0 && onUpdateTeam) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl">
                        <Users className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                        <h2 className="text-xl font-bold text-center text-white mb-2">Select Team</h2>
                        <p className="text-slate-400 text-center text-sm mb-6">
                            The team data for this session is missing. Please select which team this session belongs to:
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-1">
                            {allTeams.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onUpdateTeam(t.id)}
                                    className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-blue-500/50 text-white transition flex items-center justify-between group"
                                >
                                    <span className="font-medium">{t.name}</span>
                                    <span className="text-xs text-slate-500 group-hover:text-blue-400">{t.members.length} members</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 text-slate-400 hover:text-white transition text-sm font-medium"
                        >
                            Cancel Session Start
                        </button>
                    </div>
                </div>
            );
        }

        // Graceful handling if absolutely no teams exist
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center shadow-xl">
                    <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">No Teams Available</h2>
                    <p className="text-slate-400 mb-6">
                        Could not locate any teams. You can still start the session without tracking attendance.
                    </p>
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
                    >
                        Continue Without Attendance
                    </button>
                </div>
            </div>
        );
    }

    const presentCount = Object.values(attendance).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            Attendance Check
                        </h2>
                        <p className="text-sm text-slate-400">
                            {team.name} • {presentCount} / {team.members.length} Present
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={toggleAll}
                            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition"
                        >
                            {Object.values(attendance).every(v => v) ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {team.members.map(member => {
                            const isPresent = attendance[member.id];
                            return (
                                <div
                                    key={member.id}
                                    onClick={() => toggleMember(member.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 group select-none",
                                        isPresent
                                            ? "bg-green-500/10 border-green-500/50 hover:bg-green-500/20"
                                            : "bg-slate-700/30 border-slate-700 hover:bg-slate-700/50 opacity-70"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                            isPresent ? "bg-green-500 text-slate-900" : "bg-slate-600 text-slate-400"
                                        )}>
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={cn("font-medium transition", isPresent ? "text-white" : "text-slate-400")}>
                                                {member.name}
                                            </div>
                                            <div className="text-xs text-slate-500 capitalize">{member.role}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center border transition",
                                        isPresent
                                            ? "bg-green-500 border-green-500 hover:scale-110"
                                            : "border-slate-500 group-hover:border-slate-400"
                                    )}>
                                        {isPresent && <Check className="w-4 h-4 text-slate-900" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white transition"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-lg transition shadow-lg shadow-green-500/20"
                    >
                        Confirm & Start
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
