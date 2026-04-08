'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Pen, Eraser, Trash2, Undo2, Circle, Minus, Type, Download, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

type Tool = 'pen' | 'eraser' | 'line' | 'circle' | 'text';
type DrawAction = {
    type: 'path' | 'line' | 'circle' | 'text';
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    center?: { x: number; y: number };
    radius?: number;
    text?: string;
    color: string;
    lineWidth: number;
    isEraser?: boolean;
};

const COLORS = [
    '#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4',
];

const LINE_WIDTHS = [2, 4, 6, 8];

export default function TennisBoard() {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(4);
    const [isDrawing, setIsDrawing] = useState(false);
    const [actions, setActions] = useState<DrawAction[]>([]);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showWidthPicker, setShowWidthPicker] = useState(false);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Load background image
    useEffect(() => {
        if (isOpen && !bgImageRef.current) {
            const img = new Image();
            img.src = '/tennis-court-bg.png';
            img.onload = () => {
                bgImageRef.current = img;
                setImageLoaded(true);
            };
        }
    }, [isOpen]);

    // Redraw canvas
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background image
        if (bgImageRef.current) {
            // Calculate aspect-ratio-preserving fit
            const img = bgImageRef.current;
            const canvasRatio = canvas.width / canvas.height;
            const imgRatio = img.width / img.height;

            let drawW, drawH, drawX, drawY;
            if (imgRatio > canvasRatio) {
                // Image is wider than canvas
                drawH = canvas.height;
                drawW = drawH * imgRatio;
                drawX = (canvas.width - drawW) / 2;
                drawY = 0;
            } else {
                drawW = canvas.width;
                drawH = drawW / imgRatio;
                drawX = 0;
                drawY = (canvas.height - drawH) / 2;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        // Replay all actions
        actions.forEach(action => {
            ctx.strokeStyle = action.isEraser ? 'transparent' : action.color;
            ctx.lineWidth = action.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (action.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            if (action.type === 'path' && action.points && action.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(action.points[0].x, action.points[0].y);
                for (let i = 1; i < action.points.length; i++) {
                    ctx.lineTo(action.points[i].x, action.points[i].y);
                }
                ctx.stroke();
            } else if (action.type === 'line' && action.start && action.end) {
                ctx.beginPath();
                ctx.moveTo(action.start.x, action.start.y);
                ctx.lineTo(action.end.x, action.end.y);
                ctx.stroke();
            } else if (action.type === 'circle' && action.center && action.radius) {
                ctx.beginPath();
                ctx.arc(action.center.x, action.center.y, action.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (action.type === 'text' && action.start && action.text) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.font = `${action.lineWidth * 6}px Inter, sans-serif`;
                ctx.fillStyle = action.color;
                ctx.fillText(action.text, action.start.x, action.start.y);
            }
        });

        ctx.globalCompositeOperation = 'source-over';
    }, [actions]);

    useEffect(() => {
        if (isOpen && imageLoaded) {
            redraw();
        }
    }, [isOpen, imageLoaded, redraw]);

    // Resize canvas to fill window
    useEffect(() => {
        if (!isOpen) return;
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Save current drawing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.drawImage(canvas, 0, 0);

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            redraw();
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isOpen, redraw]);

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const point = getCanvasPoint(e);

        if (tool === 'text') {
            const text = prompt(t('tb.enterText'));
            if (text) {
                const newAction: DrawAction = {
                    type: 'text',
                    start: point,
                    text,
                    color,
                    lineWidth,
                };
                setActions(prev => [...prev, newAction]);
            }
            return;
        }

        setIsDrawing(true);
        if (tool === 'pen' || tool === 'eraser') {
            setCurrentPath([point]);
        } else {
            setStartPoint(point);
        }
    };

    const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const point = getCanvasPoint(e);

        if (tool === 'pen' || tool === 'eraser') {
            setCurrentPath(prev => [...prev, point]);
            // Draw live stroke
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && currentPath.length > 0) {
                const last = currentPath[currentPath.length - 1];
                ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
                ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    };

    const handleEnd = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        setIsDrawing(false);

        if (tool === 'pen' || tool === 'eraser') {
            if (currentPath.length > 1) {
                const newAction: DrawAction = {
                    type: 'path',
                    points: [...currentPath],
                    color,
                    lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
                    isEraser: tool === 'eraser',
                };
                setActions(prev => [...prev, newAction]);
            }
            setCurrentPath([]);
        } else if (startPoint) {
            const endPoint = getCanvasPoint(e);
            if (tool === 'line') {
                const newAction: DrawAction = {
                    type: 'line',
                    start: startPoint,
                    end: endPoint,
                    color,
                    lineWidth,
                };
                setActions(prev => [...prev, newAction]);
            } else if (tool === 'circle') {
                const dx = endPoint.x - startPoint.x;
                const dy = endPoint.y - startPoint.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                const newAction: DrawAction = {
                    type: 'circle',
                    center: startPoint,
                    radius,
                    color,
                    lineWidth,
                };
                setActions(prev => [...prev, newAction]);
            }
            setStartPoint(null);
            redraw();
        }
    };

    const undo = () => {
        setActions(prev => prev.slice(0, -1));
    };

    const clearAll = () => {
        setActions([]);
    };

    const downloadBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Redraw to ensure all actions are rendered
        redraw();
        const link = document.createElement('a');
        link.download = `tennisboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    const tools: { key: Tool; icon: React.ReactNode; label: string }[] = [
        { key: 'pen', icon: <Pen className="w-5 h-5" />, label: t('tb.draw') },
        { key: 'eraser', icon: <Eraser className="w-5 h-5" />, label: t('tb.erase') },
        { key: 'line', icon: <Minus className="w-5 h-5" />, label: t('tb.line') },
        { key: 'circle', icon: <Circle className="w-5 h-5" />, label: t('tb.circle') },
        { key: 'text', icon: <Type className="w-5 h-5" />, label: t('tb.text') },
    ];

    return (
        <>
            {/* Tennis Court Floating Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-green-600 to-emerald-700 rounded-full shadow-lg hover:shadow-green-500/30 transition-all text-white flex items-center justify-center"
                title="TennisBoard"
            >
                {/* Tennis court mini icon */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="1" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <rect x="6" y="7" width="12" height="10" rx="0" strokeWidth="1.5" />
                </svg>
            </motion.button>

            {/* Full Screen TennisBoard */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900 flex flex-col"
                    >
                        {/* Top Toolbar */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
                            {/* Left: Close + Title */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition backdrop-blur-sm min-w-[48px] min-h-[48px] flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-white font-bold text-lg">TennisBoard</h2>
                            </div>

                            {/* Center: Tools */}
                            <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-xl px-2 py-1.5">
                                {tools.map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTool(t.key)}
                                        title={t.label}
                                        className={cn(
                                            "p-3 rounded-lg transition-all min-w-[48px] min-h-[48px] flex items-center justify-center",
                                            tool === t.key
                                                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                                        )}
                                    >
                                        {t.icon}
                                    </button>
                                ))}

                                <div className="w-px h-6 bg-slate-700 mx-1" />

                                {/* Color picker button */}
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowColorPicker(!showColorPicker); setShowWidthPicker(false); }}
                                        className="p-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                                        title="Color"
                                    >
                                        <div className="w-5 h-5 rounded-full border-2 border-current" style={{ backgroundColor: color }} />
                                    </button>
                                    {showColorPicker && (
                                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-4 border border-slate-700/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-[260px] sm:w-[280px]">
                                            <div className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">Color Palette</div>
                                            <div className="flex flex-wrap items-center justify-center gap-3">
                                                {COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => { setColor(c); setShowColorPicker(false); }}
                                                        className={cn(
                                                            "w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110",
                                                            color === c
                                                                ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-4 ring-white/10"
                                                                : "border-slate-700/50 hover:border-white/50 hover:shadow-lg"
                                                        )}
                                                        style={{ backgroundColor: c }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Line width picker button */}
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowWidthPicker(!showWidthPicker); setShowColorPicker(false); }}
                                        className="p-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                                        title="Stroke Width"
                                    >
                                        <Palette className="w-5 h-5" />
                                    </button>
                                    {showWidthPicker && (
                                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-4 border border-slate-700/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-max">
                                            <div className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">Stroke Size</div>
                                            <div className="flex items-center gap-3">
                                                {LINE_WIDTHS.map(w => (
                                                    <button
                                                        key={w}
                                                        onClick={() => { setLineWidth(w); setShowWidthPicker(false); }}
                                                        className={cn(
                                                            "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 border-2",
                                                            lineWidth === w
                                                                ? "bg-slate-800 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-4 ring-green-500/20"
                                                                : "bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-500"
                                                        )}
                                                        title={`Size: ${w}`}
                                                    >
                                                        <div
                                                            className="rounded-full bg-slate-200 transition-all shadow-sm"
                                                            style={{ width: w * 2.5, height: w * 2.5 }}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={undo}
                                    disabled={actions.length === 0}
                                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition backdrop-blur-sm disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"
                                    title={t('tb.undo')}
                                >
                                    <Undo2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={clearAll}
                                    disabled={actions.length === 0}
                                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition backdrop-blur-sm disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"
                                    title={t('tb.clearAll')}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={downloadBoard}
                                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition backdrop-blur-sm min-w-[48px] min-h-[48px] flex items-center justify-center"
                                    title={t('tb.download')}
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Canvas */}
                        <canvas
                            ref={canvasRef}
                            className={cn(
                                "w-full h-full",
                                tool === 'eraser' ? 'cursor-cell' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
                            )}
                            onMouseDown={handleStart}
                            onMouseMove={handleMove}
                            onMouseUp={handleEnd}
                            onMouseLeave={handleEnd}
                            onTouchStart={handleStart}
                            onTouchMove={handleMove}
                            onTouchEnd={handleEnd}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
