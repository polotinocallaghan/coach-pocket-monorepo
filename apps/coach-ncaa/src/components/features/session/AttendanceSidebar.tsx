import React, { useState, useEffect } from 'react';
import { dataStore } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { Check, Users, UserCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceSidebarProps {
    teamId: string;
    attendance?: { memberId: string; present: boolean }[];
    onUpdate: (attendance: { memberId: string; present: boolean }[]) => void;
    className?: string;
}

export default function AttendanceSidebar({ teamId, attendance: parentAttendance, onUpdate, className }: AttendanceSidebarProps) {
    const team = useDataStore(() => dataStore.getTeam(teamId));
    const [localAttendance, setLocalAttendance] = useState<Record<string, boolean>>({});



    // Sync from parent if provided, otherwise initialize
    useEffect(() => {
        if (team && parentAttendance) {
            const initial: Record<string, boolean> = {};
            team.members.forEach(member => {
                const record = parentAttendance.find(r => r.memberId === member.id);
                // Default to true if not recorded? Or false? Let's assume true for initialization, or respect recording.
                // If parentAttendance is provided, use it strictly.
                initial[member.id] = record ? record.present : false;
            });
            setLocalAttendance(initial);
        } else if (team && !parentAttendance) {
            // Initialize all true if new?
            const initial: Record<string, boolean> = {};
            team.members.forEach(m => initial[m.id] = true);
            setLocalAttendance(initial);
        }
    }, [parentAttendance, team]);

    const toggleMember = (id: string) => {
        const newState = { ...localAttendance, [id]: !localAttendance[id] };
        setLocalAttendance(newState);

        // Notify parent immediately
        const result = Object.entries(newState).map(([memberId, present]: [string, boolean]) => ({
            memberId,
            present
        }));
        onUpdate(result);
    };

    if (!team) return null;

    const presentCount = Object.values(localAttendance).filter(Boolean).length;

    return (
        <div className={cn("flex flex-col h-full bg-slate-800 border-l border-slate-700 w-80", className)}>
            <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Attendance
                </h2>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-slate-400">{team.name}</span>
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        presentCount === team.members.length ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"
                    )}>
                        {presentCount}/{team.members.length}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {team.members.map(member => {
                    const isPresent = localAttendance[member.id];
                    return (
                        <div
                            key={member.id}
                            onClick={() => toggleMember(member.id)}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 group select-none",
                                isPresent
                                    ? "bg-slate-700/50 border-green-500/30 hover:bg-slate-700"
                                    : "bg-slate-800 border-slate-700 hover:bg-slate-700/50 opacity-60 hover:opacity-100"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                    isPresent ? "bg-green-500 text-slate-900" : "bg-slate-600 text-slate-400"
                                )}>
                                    {member.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-sm font-medium text-slate-200">
                                    {member.name}
                                </div>
                            </div>
                            {isPresent && <Check className="w-4 h-4 text-green-400" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
