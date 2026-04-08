'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TacticalBoardProps {
    isOpen: boolean;
    onClose: () => void;
}

const COLORS = [
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'White', value: '#ffffff' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' }
];

export default function TacticalBoard({ isOpen, onClose }: TacticalBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#fbbf24');
    const [lineWidth, setLineWidth] = useState(4);

    useEffect(() => {
        if (!isOpen) return;
        const initCanvas = () => {
            if (!canvasRef.current || !containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();

            // Save existing image data before resizing if we want to keep it, 
            // but for simplicity we let it clear on resize or we can restore it.
            // A simple resize will clear the canvas.
            canvasRef.current.width = width;
            canvasRef.current.height = height;

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = lineWidth;
            }
        };

        // Delay initialization slightly to ensure container is rendered and sized
        setTimeout(initCanvas, 50);

        window.addEventListener('resize', initCanvas);
        return () => window.removeEventListener('resize', initCanvas);
    }, [isOpen, lineWidth]);

    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            // Draw a dot immediately for single clicks
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.closePath();
    };

    const clearBoard = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'c') clearBoard();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Do not return null early, otherwise AnimatePresence won't animate the exit.
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] bg-slate-900 flex flex-col md:flex-row overflow-hidden"
                >
                    {/* Toolbar */}
                    <div className="bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-4 flex md:flex-col items-center justify-between md:justify-start gap-4 shrink-0 overflow-x-auto md:w-20">
                        <div className="flex md:flex-col items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-700 bg-slate-800/50 rounded-xl transition text-slate-400 hover:text-white"
                                title="Close Board (Esc)"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="h-8 w-px md:h-px md:w-8 bg-slate-700 my-1 hidden md:block" />

                            <div className="flex md:flex-col gap-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        onClick={() => setColor(c.value)}
                                        className={cn(
                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                            color === c.value ? "border-white scale-110 shadow-lg" : "border-slate-700 hover:border-slate-500 hover:scale-105"
                                        )}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            <div className="h-8 w-px md:h-px md:w-8 bg-slate-700 my-1 hidden md:block" />

                            <button
                                onClick={clearBoard}
                                className="p-3 hover:bg-slate-700 bg-slate-800/50 rounded-xl transition text-red-400 hover:text-red-300 flex flex-col items-center justify-center gap-1 group"
                                title="Clear Board (C)"
                            >
                                <Eraser className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                        {/* Court Container */}
                        <div
                            ref={containerRef}
                            className="relative w-full h-full max-h-[90vh] max-w-[90vw] touch-none"
                            style={{ aspectRatio: '360/780' }}
                        >
                            {/* Court SVG Background */}
                            <svg viewBox="0 0 360 780" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                                {/* Base/Background coloring can go here if needed */}
                                <rect x="0" y="0" width="360" height="780" className="fill-[#1e40af]/20" />

                                {/* Inner Court Area */}
                                <rect x="45" y="0" width="270" height="780" className="fill-[#1e3a8a]/40" />

                                {/* All lines */}
                                <g className="stroke-slate-300 fill-none" strokeWidth="4">
                                    {/* Outer boundary (doubles) */}
                                    <rect x="0" y="0" width="360" height="780" />
                                    {/* Singles lines */}
                                    <line x1="45" y1="0" x2="45" y2="780" />
                                    <line x1="315" y1="0" x2="315" y2="780" />
                                    {/* Net */}
                                    <line x1="-10" y1="390" x2="370" y2="390" strokeWidth="6" strokeDasharray="6 6" className="stroke-slate-200" />
                                    {/* Service lines */}
                                    <line x1="45" y1="180" x2="315" y2="180" />
                                    <line x1="45" y1="600" x2="315" y2="600" />
                                    {/* Center service line */}
                                    <line x1="180" y1="180" x2="180" y2="600" />
                                    {/* Center marks */}
                                    <line x1="180" y1="0" x2="180" y2="10" />
                                    <line x1="180" y1="770" x2="180" y2="780" />
                                </g>
                            </svg>

                            {/* Drawing Canvas */}
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                                onPointerDown={startDrawing}
                                onPointerMove={draw}
                                onPointerUp={stopDrawing}
                                onPointerOut={stopDrawing}
                            />
                        </div>

                        <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-slate-400 px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none">
                            Draw strategy
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
