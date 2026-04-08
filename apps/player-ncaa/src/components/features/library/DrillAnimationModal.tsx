'use client';

import { motion } from 'framer-motion';
import { X, Play } from 'lucide-react';
import { Exercise } from '@coach-pocket/core';

interface DrillAnimationModalProps {
    isOpen: boolean;
    onClose: () => void;
    drill: Exercise | null;
}

export default function DrillAnimationModal({ isOpen, onClose, drill }: DrillAnimationModalProps) {
    if (!isOpen || !drill) return null;

    // Depending on drill category or player count, we can do slight variations. 
    // Here is a generic cross-court rally animation layout.

    // Keyframes for the ball X and Y (back and forth)
    const ballX = ["10%", "80%", "10%", "20%", "80%", "20%"];
    const ballY = ["80%", "20%", "70%", "85%", "15%", "90%"];

    // Keyframes for player 1 (Bottom left)
    const p1X = ["5%", "25%", "5%", "15%", "5%", "15%"];
    const p1Y = ["85%", "75%", "90%", "85%", "95%", "85%"];

    // Keyframes for player 2 (Top right)
    const p2X = ["85%", "75%", "85%", "70%", "85%", "70%"];
    const p2Y = ["15%", "25%", "10%", "25%", "5%", "25%"];

    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
                {/* Court Area */}
                <div className="flex-1 bg-blue-900/40 relative aspect-video md:aspect-auto border-b md:border-b-0 md:border-r border-slate-700 p-8 flex items-center justify-center overflow-hidden">

                    {/* The Court Design */}
                    <div className="w-full max-w-[300px] h-[500px] bg-blue-600/30 border-2 border-white/50 relative shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                        {/* Doubles Alleys */}
                        <div className="absolute top-0 bottom-0 left-[15%] w-[2px] bg-white/50" />
                        <div className="absolute top-0 bottom-0 right-[15%] w-[2px] bg-white/50" />

                        {/* Service Lines */}
                        <div className="absolute top-[25%] left-[15%] right-[15%] h-[2px] bg-white/50" />
                        <div className="absolute bottom-[25%] left-[15%] right-[15%] h-[2px] bg-white/50" />

                        {/* Center Service Line */}
                        <div className="absolute top-[25%] bottom-[25%] left-[50%] w-[2px] bg-white/50 -translate-x-1/2" />

                        {/* The Net */}
                        <div className="absolute top-[50%] left-[-2%] right-[-2%] h-[4px] bg-white border-t border-b border-slate-400 z-10 shadow-lg -translate-y-1/2 overflow-hidden flex flex-col justify-center">
                            <div className="w-full h-[1px] bg-slate-300 opacity-50 mb-[1px]"></div>
                            <div className="w-full h-[1px] bg-slate-300 opacity-50"></div>
                        </div>

                        {/* Player 1 (Bottom) */}
                        <motion.div
                            className="absolute w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg z-20 flex items-center justify-center text-[10px] font-bold text-white"
                            animate={{ left: p1X, top: p1Y }}
                            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
                        >
                            P1
                        </motion.div>

                        {/* Player 2 (Top) */}
                        <motion.div
                            className="absolute w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-lg z-20 flex items-center justify-center text-[10px] font-bold text-white"
                            animate={{ left: p2X, top: p2Y }}
                            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
                        >
                            P2
                        </motion.div>

                        {/* Extra players if playerCount > 2 */}
                        {drill.playerCount && drill.playerCount > 2 && (
                            <>
                                <motion.div
                                    className="absolute w-6 h-6 rounded-full bg-purple-500 border-2 border-white shadow-lg z-20 flex items-center justify-center text-[10px] font-bold text-white"
                                    animate={{ left: ["70%", "60%", "70%"], top: ["80%", "85%", "80%"] }}
                                    transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, delay: 1 }}
                                >
                                    P3
                                </motion.div>
                                <motion.div
                                    className="absolute w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-lg z-20 flex items-center justify-center text-[10px] font-bold text-white"
                                    animate={{ left: ["20%", "30%", "20%"], top: ["20%", "15%", "20%"] }}
                                    transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, delay: 1 }}
                                >
                                    P4
                                </motion.div>
                            </>
                        )}

                        {/* The Ball */}
                        <motion.div
                            className="absolute w-3 h-3 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.8)] z-30"
                            animate={{ left: ballX, top: ballY }}
                            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                        >
                            <motion.div
                                className="w-full h-full rounded-full bg-white opacity-40 blur-[1px]"
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </motion.div>

                    </div>
                </div>

                {/* Details Area */}
                <div className="w-full md:w-96 flex flex-col p-6 overflow-y-auto">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                                {drill.category}
                            </span>
                            <h2 className="text-2xl font-bold text-white leading-tight">{drill.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors shrink-0 outline-none focus:ring-2 focus:ring-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        {drill.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Duration</div>
                            <div className="text-lg font-bold text-white">{drill.duration} min</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Players</div>
                            <div className="text-lg font-bold text-white">{drill.playerCount || 2} players</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Difficulty</div>
                            <div className="text-lg font-bold text-white">{drill.difficulty}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Focus</div>
                            <div className="text-lg font-bold text-white capitalize">{drill.tags?.[0] || drill.category}</div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-700/50">
                        <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Play className="w-4 h-4 text-green-400 fill-current" />
                            Coaching Points
                        </h4>
                        <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside marker:text-green-500">
                            <li>Keep focus on footwork and recovery position</li>
                            <li>Maintain target zones explicitly outlined in the drill</li>
                            <li>Adjust intensity according to player level</li>
                            <li>Monitor heart rate and ensure hydration</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
