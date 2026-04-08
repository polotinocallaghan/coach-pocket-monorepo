'use client';

import { useState } from 'react';
import { X, Plus, Save, Download, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import TacticalBoard from '../../shared/TacticalBoard';

// Point data structure
interface MatchPoint {
    id: string;
    pointNumber: number;
    score: string;
    server: 'P1' | 'P2';
    side: 'Deuce' | 'Ad';
    shotCount: string;
    winner: 'P1' | 'P2' | '';
    endingShot: string;
    errorType: 'Forced' | 'Unforced' | '';
    notes: string;
}

const CourtIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="2 2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="7" y1="7" x2="17" y2="7" />
        <line x1="7" y1="17" x2="17" y2="17" />
        <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
);

interface MatchChartingToolProps {
    matchTitle: string;
    player1Name?: string;
    player2Name?: string;
    onClose: () => void;
    initialData?: MatchPoint[];
    onSave?: (data: MatchPoint[]) => void;
}

export default function MatchChartingTool({
    matchTitle,
    player1Name = 'Player 1',
    player2Name = 'Player 2',
    onClose,
    initialData = [],
    onSave
}: MatchChartingToolProps) {
    const [points, setPoints] = useState<MatchPoint[]>(initialData.length > 0 ? initialData : [
        // Initialize with one empty row
        {
            id: '1',
            pointNumber: 1,
            score: '0-0',
            server: 'P1',
            side: 'Deuce',
            shotCount: '',
            winner: '',
            endingShot: '',
            errorType: '',
            notes: ''
        }
    ]);
    const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);

    const handleAddRow = () => {
        const lastPoint = points[points.length - 1];
        setPoints([
            ...points,
            {
                id: Date.now().toString(),
                pointNumber: (lastPoint?.pointNumber || 0) + 1,
                score: lastPoint?.score || '0-0', // simplistic carry over
                server: lastPoint?.server === 'P1' ? 'P1' : 'P2', // simplistic carry over
                side: lastPoint?.side === 'Deuce' ? 'Ad' : 'Deuce',
                shotCount: '',
                winner: '',
                endingShot: '',
                errorType: '',
                notes: ''
            }
        ]);
    };

    const handleUpdateRow = (id: string, field: keyof MatchPoint, value: any) => {
        setPoints(points.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleDeleteRow = (id: string) => {
        if (points.length <= 1) return;
        setPoints(points.filter(p => p.id !== id));
    };

    const handleExportCSV = () => {
        const headers = ['Point', 'Score', 'Server', 'Side', 'Shots', 'Winner', 'Ending Shot', 'Error Type', 'Notes'];
        const rows = points.map(p => [
            p.pointNumber,
            p.score,
            p.server,
            p.side,
            p.shotCount,
            p.winner,
            p.endingShot,
            p.errorType,
            `"${p.notes}"` // Wrap notes in quotes to handle commas
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${matchTitle.replace(/\s+/g, '_')}_chart.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            Match Charting: <span className="text-green-400">{matchTitle}</span>
                        </h1>
                        <p className="text-sm text-slate-400">
                            {player1Name} vs {player2Name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTacticalBoardOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-green-500 rounded-lg hover:bg-green-500 hover:text-slate-900 transition border border-slate-600 mr-2"
                        title="Tactical Board"
                    >
                        <CourtIcon className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Tactical Board</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition border border-slate-600"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => onSave?.(points)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition font-medium"
                    >
                        <Save className="w-4 h-4" />
                        Save Chart
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto p-2 md:p-4 bg-slate-900 custom-scrollbar pb-32 md:pb-4">
                <div className="min-w-full md:min-w-[1000px] border-none md:border border-slate-700 rounded-lg overflow-hidden bg-transparent md:bg-slate-800/50">
                    {/* Desktop Table */}
                    <table className="hidden md:table w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-4 py-3 w-16 text-center">Pt #</th>
                                <th scope="col" className="px-4 py-3 w-24">Score</th>
                                <th scope="col" className="px-4 py-3 w-20">Server</th>
                                <th scope="col" className="px-4 py-3 w-20">Side</th>
                                <th scope="col" className="px-4 py-3 w-20">Shots</th>
                                <th scope="col" className="px-4 py-3 w-24">Winner</th>
                                <th scope="col" className="px-4 py-3 w-32">Ending Shot</th>
                                <th scope="col" className="px-4 py-3 w-28">Error Type</th>
                                <th scope="col" className="px-4 py-3">Notes</th>
                                <th scope="col" className="px-4 py-3 w-16 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {points.map((point) => (
                                <tr key={point.id} className="bg-slate-800/30 hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-2 text-center font-mono text-slate-500">
                                        {point.pointNumber}
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={point.score}
                                            onChange={(e) => handleUpdateRow(point.id, 'score', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-white p-0 text-sm"
                                            placeholder="0-0"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={point.server}
                                            onChange={(e) => handleUpdateRow(point.id, 'server', e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-slate-300 p-0 text-sm w-full cursor-pointer"
                                        >
                                            <option value="P1">P1</option>
                                            <option value="P2">P2</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={point.side}
                                            onChange={(e) => handleUpdateRow(point.id, 'side', e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-slate-300 p-0 text-sm w-full cursor-pointer"
                                        >
                                            <option value="Deuce">Deuce</option>
                                            <option value="Ad">Ad</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            value={point.shotCount}
                                            onChange={(e) => handleUpdateRow(point.id, 'shotCount', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-white p-0 text-sm"
                                            placeholder="-"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={point.winner}
                                            onChange={(e) => handleUpdateRow(point.id, 'winner', e.target.value)}
                                            className={cn(
                                                "bg-transparent border-none focus:ring-0 p-0 text-sm w-full cursor-pointer font-bold",
                                                point.winner === 'P1' ? 'text-green-400' : point.winner === 'P2' ? 'text-blue-400' : 'text-slate-500'
                                            )}
                                        >
                                            <option value="">-</option>
                                            <option value="P1">P1</option>
                                            <option value="P2">P2</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={point.endingShot}
                                            onChange={(e) => handleUpdateRow(point.id, 'endingShot', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-white p-0 text-sm"
                                            placeholder="e.g. FH Cross"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={point.errorType}
                                            onChange={(e) => handleUpdateRow(point.id, 'errorType', e.target.value)}
                                            className={cn(
                                                "bg-transparent border-none focus:ring-0 p-0 text-sm w-full cursor-pointer",
                                                point.errorType === 'Unforced' ? 'text-red-400' : point.errorType === 'Forced' ? 'text-orange-400' : 'text-slate-500'
                                            )}
                                        >
                                            <option value="">-</option>
                                            <option value="Forced">Forced</option>
                                            <option value="Unforced">Unforced</option>
                                            <option value="Winner">Winner</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={point.notes}
                                            onChange={(e) => handleUpdateRow(point.id, 'notes', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-slate-400 p-0 text-sm italic placeholder:not-italic"
                                            placeholder="Add notes..."
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => handleDeleteRow(point.id)}
                                            className="p-1 hover:bg-slate-700 rounded text-slate-600 hover:text-red-400 transition"
                                            title="Delete row"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Cards View */}
                    <div className="md:hidden flex flex-col gap-4 mb-6">
                        {points.map((point) => (
                            <div key={point.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col gap-4 relative">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                                    <span className="text-green-400 font-black font-mono text-lg">PT #{point.pointNumber}</span>
                                    <button onClick={() => handleDeleteRow(point.id)} className="p-3 bg-slate-900/50 rounded-full text-slate-400 hover:text-red-400 transition" title="Delete Point">
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Score</label>
                                        <input type="text" value={point.score} onChange={(e) => handleUpdateRow(point.id, 'score', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-lg font-black text-center focus:ring-2 focus:ring-green-500/50" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Server</label>
                                        <select value={point.server} onChange={(e) => handleUpdateRow(point.id, 'server', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-base font-bold text-center focus:ring-2 focus:ring-green-500/50 appearance-none">
                                            <option>P1</option><option>P2</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Side</label>
                                        <select value={point.side} onChange={(e) => handleUpdateRow(point.id, 'side', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-base font-bold text-center appearance-none">
                                            <option>Deuce</option><option>Ad</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Winner</label>
                                        <select value={point.winner} onChange={(e) => handleUpdateRow(point.id, 'winner', e.target.value)} className={cn("bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-base font-black text-center appearance-none", point.winner === 'P1' && "text-green-400", point.winner === 'P2' && "text-blue-400")}>
                                            <option value="">- None -</option><option value="P1">P1</option><option value="P2">P2</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Ending Shot & Error</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={point.endingShot} onChange={(e)=>handleUpdateRow(point.id, 'endingShot', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-base flex-1 min-w-0" placeholder="e.g. Forehand..." />
                                            <select value={point.errorType} onChange={(e)=>handleUpdateRow(point.id, 'errorType', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white h-14 text-sm font-bold flex-1 appearance-none">
                                                <option value="">- Error -</option><option value="Forced">Forced</option><option value="Unforced">Unforced</option><option value="Winner">Winner</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Row Button - Responsive */}
                    <div className="fixed md:static bottom-0 left-0 w-full p-4 md:p-0 bg-slate-900/90 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-t border-slate-800 md:border-t-0 z-50">
                        <button
                            onClick={handleAddRow}
                            className="w-full py-5 md:py-3 bg-green-500 md:bg-slate-800 hover:bg-green-400 md:hover:bg-slate-700/80 text-slate-900 md:text-slate-400 md:hover:text-white transition flex items-center justify-center gap-3 text-lg md:text-sm font-black md:font-medium border border-green-400 md:border-t md:border-slate-700 rounded-2xl md:rounded-none rounded-b-lg shadow-[0_0_40px_rgba(34,197,94,0.3)] md:shadow-none active:scale-95 md:active:scale-100"
                        >
                            <Plus className="w-6 h-6 md:w-4 md:h-4" />
                            Registrar Punto
                        </button>
                    </div>
                </div>
            </div>

            <TacticalBoard
                isOpen={isTacticalBoardOpen}
                onClose={() => setIsTacticalBoardOpen(false)}
            />
        </div>
    );
}
