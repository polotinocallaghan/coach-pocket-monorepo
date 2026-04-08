'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Exercise } from '@coach-pocket/core';
import { generateId } from '@/lib/utils';
import { Dumbbell, Users } from 'lucide-react';

interface PrintableTeamSessionProps {
    title: string;
    teamName: string;
    date: string;
    timeBlocks: string[];
    assignments: Record<string, string[]>;
    drillAssignments: Record<string, string[]>;
    exercises: Exercise[];
    players: any[];
}

export default function PrintableTeamSession({
    title,
    teamName,
    date,
    timeBlocks,
    assignments,
    drillAssignments,
    exercises,
    players,
}: PrintableTeamSessionProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="print-root">
            <div className="print-header">
                <div>
                    <h1>{title}</h1>
                    <p>{teamName} • {date}</p>
                </div>
                <div className="logo-placeholder">
                    <span>Coach Pocket</span>
                </div>
            </div>

            <div className="print-grid">
                {/* Header Row */}
                <div className="print-row header-row">
                    <div className="print-cell time-col">Time</div>
                    {[1, 2, 3, 4].map(court => (
                        <div key={court} className="print-cell court-header">Court {court}</div>
                    ))}
                </div>

                {/* Data Rows */}
                {timeBlocks.map((time) => (
                    <div key={time} className="print-row">
                        <div className="print-cell time-cell">{time}</div>
                        {[1, 2, 3, 4].map(court => {
                            const slotId = `court-${court}-${time}`;
                            const assignedPlayerIds = assignments[slotId] || [];
                            const assignedDrillIds = drillAssignments[slotId] || [];

                            const slotDrills = assignedDrillIds
                                .map(id => exercises.find(e => e.id === id))
                                .filter(Boolean) as Exercise[];

                            const slotPlayers = assignedPlayerIds
                                .map(id => players.find(p => p.id === id))
                                .filter(Boolean);

                            return (
                                <div key={court} className="print-cell court-cell">
                                    {/* Drills Section */}
                                    {slotDrills.length > 0 ? (
                                        <div className="drills-section">
                                            {slotDrills.map((drill, idx) => (
                                                <div key={idx} className="drill-item">
                                                    <span className="drill-icon">
                                                        {drill.category === 'drill' ? '●' : drill.category === 'game' ? '★' : '■'}
                                                    </span>
                                                    <span className="drill-title">{drill.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-slot">-</div>
                                    )}

                                    {/* Players Section */}
                                    {slotPlayers.length > 0 && (
                                        <div className="players-section">
                                            {slotPlayers.map(p => p.name.split(' ')[0]).join(', ')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="print-footer">
                <p>Printed on {new Date().toLocaleDateString()}</p>
                <div className="metrics">
                    <span>{exercises.length} Drills</span>
                    <span>•</span>
                    <span>{new Set(Object.values(assignments).flat()).size} Players</span>
                </div>
            </div>
        </div>,
        document.body
    );
}


