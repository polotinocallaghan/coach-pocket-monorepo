'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { VideoClip, LearningChapter } from '@coach-pocket/core';
import { generateId } from '@/lib/utils';
import {
    Play, Pause, Scissors, Plus, X, Save, Tag,
    MessageSquare, ChevronDown, ChevronUp, Trash2,
    BookOpen, Clock, AlertTriangle, CheckCircle2, Zap,
    SkipBack, SkipForward, Volume2, VolumeX, Maximize,
    Film, Eye, Send, FolderPlus, GripVertical
} from 'lucide-react';

interface VideoFeedbackProps {
    videoUrl: string;
    clips: VideoClip[];
    chapters: LearningChapter[];
    onSave: (clips: VideoClip[], chapters: LearningChapter[]) => void;
    playerName?: string;
}

// Format seconds to mm:ss
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoFeedback({ videoUrl, clips: initialClips, chapters: initialChapters, onSave, playerName }: VideoFeedbackProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Video state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Clips & chapters state
    const [clips, setClips] = useState<VideoClip[]>(initialClips);
    const [chapters, setChapters] = useState<LearningChapter[]>(initialChapters);

    // Clip creation state
    const [isCreatingClip, setIsCreatingClip] = useState(false);
    const [clipStart, setClipStart] = useState<number | null>(null);
    const [clipEnd, setClipEnd] = useState<number | null>(null);
    const [clipTitle, setClipTitle] = useState('');
    const [clipNote, setClipNote] = useState('');
    const [clipSeverity, setClipSeverity] = useState<'positive' | 'improvement' | 'critical'>('improvement');
    const [clipTags, setClipTags] = useState<string[]>([]);
    const [clipChapterId, setClipChapterId] = useState<string>('');
    const [newTagInput, setNewTagInput] = useState('');

    // UI state
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'clips' | 'chapters'>('clips');
    const [showNewChapterModal, setShowNewChapterModal] = useState(false);
    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [newChapterColor, setNewChapterColor] = useState('#8b5cf6');
    const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Video controls
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const seekTo = useCallback((time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    const skip = useCallback((seconds: number) => {
        if (!videoRef.current) return;
        const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    // Time update handler
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    // Timeline click handler
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !duration) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const time = percent * duration;
        seekTo(time);
    };

    // Clip creation
    const startClipping = () => {
        setIsCreatingClip(true);
        setClipStart(currentTime);
        setClipEnd(null);
        setClipTitle('');
        setClipNote('');
        setClipSeverity('improvement');
        setClipTags([]);
        setClipChapterId('');
        if (isPlaying) {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    };

    const setMarkIn = () => {
        setClipStart(currentTime);
    };

    const setMarkOut = () => {
        setClipEnd(currentTime);
    };

    const addTag = () => {
        if (newTagInput.trim() && !clipTags.includes(newTagInput.trim().toLowerCase())) {
            setClipTags(prev => [...prev, newTagInput.trim().toLowerCase()]);
            setNewTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setClipTags(prev => prev.filter(t => t !== tag));
    };

    const saveClip = () => {
        if (clipStart === null || clipEnd === null || !clipNote.trim()) return;

        const newClip: VideoClip = {
            id: generateId(),
            startTime: Math.min(clipStart, clipEnd),
            endTime: Math.max(clipStart, clipEnd),
            title: clipTitle.trim() || `Clip at ${formatTime(clipStart)}`,
            coachNote: clipNote.trim(),
            tags: clipTags,
            chapterId: clipChapterId || undefined,
            severity: clipSeverity,
            createdAt: new Date().toISOString(),
        };

        const updatedClips = [...clips, newClip];
        setClips(updatedClips);

        // If assigned to a chapter, update chapter
        if (clipChapterId) {
            setChapters(prev => prev.map(ch =>
                ch.id === clipChapterId
                    ? { ...ch, clipIds: [...ch.clipIds, newClip.id] }
                    : ch
            ));
        }

        setIsCreatingClip(false);
        setClipStart(null);
        setClipEnd(null);
        setHasUnsavedChanges(true);
    };

    const cancelClip = () => {
        setIsCreatingClip(false);
        setClipStart(null);
        setClipEnd(null);
    };

    const deleteClip = (clipId: string) => {
        setClips(prev => prev.filter(c => c.id !== clipId));
        setChapters(prev => prev.map(ch => ({
            ...ch,
            clipIds: ch.clipIds.filter(id => id !== clipId)
        })));
        if (selectedClipId === clipId) setSelectedClipId(null);
        setHasUnsavedChanges(true);
    };

    const playClip = (clip: VideoClip) => {
        seekTo(clip.startTime);
        setSelectedClipId(clip.id);
        videoRef.current?.play();
        setIsPlaying(true);
    };

    // Chapter management
    const createChapter = () => {
        if (!newChapterTitle.trim()) return;
        const chapter: LearningChapter = {
            id: generateId(),
            title: newChapterTitle.trim(),
            color: newChapterColor,
            clipIds: [],
        };
        setChapters(prev => [...prev, chapter]);
        setShowNewChapterModal(false);
        setNewChapterTitle('');
        setHasUnsavedChanges(true);
    };

    const deleteChapter = (chapterId: string) => {
        // Unassign clips from chapter
        setClips(prev => prev.map(c => c.chapterId === chapterId ? { ...c, chapterId: undefined } : c));
        setChapters(prev => prev.filter(ch => ch.id !== chapterId));
        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
        onSave(clips, chapters);
        setHasUnsavedChanges(false);
    };

    // Stop clip playback when it reaches the end time
    useEffect(() => {
        if (selectedClipId && videoRef.current) {
            const clip = clips.find(c => c.id === selectedClipId);
            if (clip && currentTime >= clip.endTime) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [currentTime, selectedClipId, clips]);

    const severityConfig = {
        positive: { label: 'Great Shot', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', dot: 'bg-green-500' },
        improvement: { label: 'Area to Improve', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', dot: 'bg-yellow-500' },
        critical: { label: 'Critical Fix', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', dot: 'bg-red-500' },
    };

    const unassignedClips = clips.filter(c => !c.chapterId);

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-purple-400" />
                        📹 Post-Match Video Analysis
                        <span className="text-[9px] uppercase font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">Post Match</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Create clips, add feedback notes, and build learning chapters from the recorded video</p>
                </div>
            </div>

            {/* Video Player with Timeline */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                {/* Video */}
                <div className="relative bg-black aspect-video group">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        onClick={togglePlay}
                        muted={isMuted}
                    />

                    {/* Play overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                        </div>
                    )}

                    {/* Clip creation overlay */}
                    {isCreatingClip && (
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <div className="bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                                <Scissors className="w-3.5 h-3.5" />
                                CLIPPING MODE
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={setMarkIn}
                                    className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500 transition"
                                >
                                    Mark IN [{clipStart !== null ? formatTime(clipStart) : '--:--'}]
                                </button>
                                <button
                                    onClick={setMarkOut}
                                    className="bg-orange-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-500 transition"
                                >
                                    Mark OUT [{clipEnd !== null ? formatTime(clipEnd) : '--:--'}]
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Selected clip info overlay */}
                    {selectedClipId && (() => {
                        const clip = clips.find(c => c.id === selectedClipId);
                        if (!clip) return null;
                        const sev = severityConfig[clip.severity || 'improvement'];
                        return (
                            <div className="absolute bottom-16 left-3 right-3 pointer-events-none">
                                <div className={cn("p-3 rounded-xl border backdrop-blur-md pointer-events-auto", sev.bg)}>
                                    <div className="flex items-start gap-2">
                                        <span className={sev.color}>{sev.icon}</span>
                                        <div>
                                            <div className="text-xs font-bold text-white">{clip.title}</div>
                                            <p className="text-xs text-slate-300 mt-0.5 italic">"{clip.coachNote}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Controls Bar */}
                <div className="px-4 py-3 bg-slate-900/80 space-y-2">
                    {/* Timeline */}
                    <div
                        ref={timelineRef}
                        className="relative h-3 bg-slate-700 rounded-full cursor-pointer group"
                        onClick={handleTimelineClick}
                    >
                        {/* Progress */}
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-100"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />

                        {/* Clip markers */}
                        {clips.map(clip => {
                            const startPercent = duration ? (clip.startTime / duration) * 100 : 0;
                            const widthPercent = duration ? ((clip.endTime - clip.startTime) / duration) * 100 : 0;
                            const sev = severityConfig[clip.severity || 'improvement'];
                            return (
                                <div
                                    key={clip.id}
                                    className={cn(
                                        "absolute top-0 h-full rounded-full opacity-40 hover:opacity-80 transition-opacity cursor-pointer",
                                        sev.dot
                                    )}
                                    style={{ left: `${startPercent}%`, width: `${Math.max(0.5, widthPercent)}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playClip(clip);
                                    }}
                                    title={clip.title}
                                />
                            );
                        })}

                        {/* Clip creation range */}
                        {isCreatingClip && clipStart !== null && (
                            <div
                                className="absolute top-0 h-full bg-red-500/40 rounded-full"
                                style={{
                                    left: `${duration ? (Math.min(clipStart, clipEnd ?? currentTime) / duration) * 100 : 0}%`,
                                    width: `${duration ? (Math.abs((clipEnd ?? currentTime) - clipStart) / duration) * 100 : 0}%`,
                                }}
                            />
                        )}

                        {/* Playhead */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-purple-500 -ml-2 group-hover:scale-125 transition-transform"
                            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    </div>

                    {/* Buttons row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => skip(-5)} className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
                                <SkipBack className="w-4 h-4" />
                            </button>
                            <button onClick={togglePlay} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white">
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button onClick={() => skip(5)} className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
                                <SkipForward className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <span className="text-xs font-mono text-slate-400 ml-2">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {!isCreatingClip ? (
                                <button
                                    onClick={startClipping}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold border border-red-500/30 transition"
                                >
                                    <Scissors className="w-3.5 h-3.5" />
                                    Create Clip
                                </button>
                            ) : (
                                <button
                                    onClick={cancelClip}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                </button>
                            )}
                            {selectedClipId && (
                                <button
                                    onClick={() => setSelectedClipId(null)}
                                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Clip Creation Form */}
            {isCreatingClip && clipStart !== null && clipEnd !== null && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 animate-in slide-in-from-top duration-300">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-red-400" />
                        New Clip: {formatTime(Math.min(clipStart, clipEnd))} → {formatTime(Math.max(clipStart, clipEnd))}
                        <span className="text-xs text-slate-500 font-normal">({Math.abs(clipEnd - clipStart).toFixed(1)}s)</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Clip Title</label>
                            <input
                                type="text"
                                value={clipTitle}
                                onChange={e => setClipTitle(e.target.value)}
                                placeholder="e.g. Missed approach shot"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Feedback Type</label>
                            <div className="flex gap-1.5">
                                {(Object.entries(severityConfig) as [VideoClip['severity'], typeof severityConfig.positive][]).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setClipSeverity(key!)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition border",
                                            clipSeverity === key ? config.bg : "bg-slate-800 border-slate-700 text-slate-500"
                                        )}
                                    >
                                        {config.icon}
                                        <span className="hidden sm:inline">{config.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs text-slate-400 block mb-1">
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            Coach's Note
                        </label>
                        <textarea
                            value={clipNote}
                            onChange={e => setClipNote(e.target.value)}
                            placeholder="e.g. 'Be more patient here — wait for the ball to come down before hitting your approach shot...'"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500 h-20 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Tags */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1"><Tag className="w-3 h-3 inline mr-1" />Tags</label>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                                {clipTags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-500/30">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addTag()}
                                    placeholder="footwork, serve..."
                                    className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                                />
                                <button onClick={addTag} className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                                    <Plus className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                            {/* Quick tags */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                                {['forehand', 'backhand', 'serve', 'volley', 'footwork', 'tactical', 'mental'].filter(t => !clipTags.includes(t)).slice(0, 4).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setClipTags(prev => [...prev, tag])}
                                        className="text-[9px] text-slate-500 bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded transition capitalize"
                                    >
                                        +{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chapter assignment */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1"><BookOpen className="w-3 h-3 inline mr-1" />Learning Chapter</label>
                            <select
                                value={clipChapterId}
                                onChange={e => setClipChapterId(e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                            >
                                <option value="">No chapter (standalone)</option>
                                {chapters.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.title}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowNewChapterModal(true)}
                                className="mt-1.5 text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <FolderPlus className="w-3 h-3" />
                                Create new chapter
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button onClick={cancelClip} className="px-4 py-2 text-slate-400 hover:text-white transition text-sm">
                            Cancel
                        </button>
                        <button
                            onClick={saveClip}
                            disabled={!clipNote.trim()}
                            className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Scissors className="w-4 h-4" />
                            Save Clip
                        </button>
                    </div>
                </div>
            )}

            {/* Clips & Chapters Tabs */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-700 px-4">
                    <div className="flex gap-1 py-2">
                        <button
                            onClick={() => setActiveView('clips')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                                activeView === 'clips' ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Film className="w-3.5 h-3.5 inline mr-1" />
                            All Clips ({clips.length})
                        </button>
                        <button
                            onClick={() => setActiveView('chapters')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                                activeView === 'chapters' ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                            Learning Chapters ({chapters.length})
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                            <span className="text-[10px] text-yellow-400 animate-pulse">Unsaved changes</span>
                        )}
                        <button
                            onClick={handleSave}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border",
                                hasUnsavedChanges
                                    ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                    : "bg-slate-700 text-slate-500 border-slate-600"
                            )}
                        >
                            <Save className="w-3.5 h-3.5" />
                            Save All
                        </button>
                    </div>
                </div>

                {/* CLIPS VIEW */}
                {activeView === 'clips' && (
                    <div className="p-4">
                        {clips.length === 0 ? (
                            <div className="text-center py-10">
                                <Scissors className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-slate-400 mb-1">No clips created yet</p>
                                <p className="text-xs text-slate-600">Use the "Create Clip" button above to mark moments in the video</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {clips.sort((a, b) => a.startTime - b.startTime).map(clip => {
                                    const sev = severityConfig[clip.severity || 'improvement'];
                                    const chapter = chapters.find(ch => ch.id === clip.chapterId);
                                    return (
                                        <div
                                            key={clip.id}
                                            onClick={() => playClip(clip)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group",
                                                selectedClipId === clip.id
                                                    ? "bg-purple-500/10 border-purple-500/30"
                                                    : "bg-slate-700/30 border-slate-700/50 hover:border-slate-600"
                                            )}
                                        >
                                            {/* Time badge */}
                                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                                                <div className={cn("w-2 h-2 rounded-full", sev.dot)} />
                                                <span className="text-[10px] font-mono text-slate-500">{formatTime(clip.startTime)}</span>
                                                <span className="text-[8px] text-slate-600">↓</span>
                                                <span className="text-[10px] font-mono text-slate-500">{formatTime(clip.endTime)}</span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-white truncate">{clip.title}</span>
                                                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5", sev.bg, sev.color)}>
                                                        {sev.icon}
                                                        {sev.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 italic line-clamp-2 mb-1">"{clip.coachNote}"</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {clip.tags?.map(tag => (
                                                        <span key={tag} className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded capitalize">{tag}</span>
                                                    ))}
                                                    {chapter && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ backgroundColor: chapter.color + '30', color: chapter.color }}>
                                                            <BookOpen className="w-2.5 h-2.5" />
                                                            {chapter.title}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); playClip(clip); }} className="p-1.5 hover:bg-slate-600 rounded-lg transition text-slate-400 hover:text-white" title="Play clip">
                                                    <Play className="w-3 h-3" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }} className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-slate-500 hover:text-red-400" title="Delete clip">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* CHAPTERS VIEW */}
                {activeView === 'chapters' && (
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-slate-500">Group related clips into learning themes</p>
                            <button
                                onClick={() => setShowNewChapterModal(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-bold border border-purple-500/30 transition"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                                New Chapter
                            </button>
                        </div>

                        {chapters.length === 0 ? (
                            <div className="text-center py-10">
                                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-slate-400 mb-1">No learning chapters yet</p>
                                <p className="text-xs text-slate-600">Create chapters to group clips by theme (e.g., "Footwork Issues")</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {chapters.map(chapter => {
                                    const chapterClips = clips.filter(c => c.chapterId === chapter.id);
                                    const isExpanded = expandedChapterId === chapter.id;
                                    return (
                                        <div key={chapter.id} className="border border-slate-700 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/30 transition text-left"
                                            >
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: chapter.color }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">{chapter.title}</div>
                                                    <div className="text-[10px] text-slate-500">{chapterClips.length} clips</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                                                        className="p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-slate-700/50 p-3 space-y-2 bg-slate-800/30">
                                                    {chapterClips.length === 0 ? (
                                                        <p className="text-xs text-slate-500 text-center py-3">No clips in this chapter yet</p>
                                                    ) : (
                                                        chapterClips.map(clip => {
                                                            const sev = severityConfig[clip.severity || 'improvement'];
                                                            return (
                                                                <div
                                                                    key={clip.id}
                                                                    onClick={() => playClip(clip)}
                                                                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 cursor-pointer transition"
                                                                >
                                                                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sev.dot)} />
                                                                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{formatTime(clip.startTime)}</span>
                                                                    <span className="text-xs text-white truncate flex-1">{clip.title}</span>
                                                                    <Play className="w-3 h-3 text-slate-500" />
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Unassigned clips section */}
                                {unassignedClips.length > 0 && (
                                    <div className="border border-slate-700/50 rounded-xl overflow-hidden opacity-60">
                                        <div className="flex items-center gap-3 p-3">
                                            <div className="w-3 h-3 rounded-full bg-slate-600 flex-shrink-0" />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-400">Unassigned Clips</div>
                                                <div className="text-[10px] text-slate-600">{unassignedClips.length} clips not in any chapter</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Player notification hint */}
            {clips.length > 0 && playerName && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                    <Send className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-blue-300 font-medium">Ready to share with {playerName}</p>
                        <p className="text-[10px] text-blue-400/60">Save to send {clips.length} clip{clips.length > 1 ? 's' : ''} as Match Notes to the player's device</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/30 transition"
                    >
                        <Send className="w-3 h-3" />
                        Save & Send
                    </button>
                </div>
            )}

            {/* New Chapter Modal */}
            {showNewChapterModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowNewChapterModal(false)}>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <FolderPlus className="w-4 h-4 text-purple-400" />
                            New Learning Chapter
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Chapter Title</label>
                                <input
                                    type="text"
                                    value={newChapterTitle}
                                    onChange={e => setNewChapterTitle(e.target.value)}
                                    placeholder="e.g. Footwork Issues, Net Approach Timing"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && createChapter()}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Color</label>
                                <div className="flex gap-2">
                                    {['#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewChapterColor(c)}
                                            className={cn(
                                                "w-8 h-8 rounded-full transition-all",
                                                newChapterColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110" : "opacity-60 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setShowNewChapterModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition text-sm">Cancel</button>
                            <button
                                onClick={createChapter}
                                disabled={!newChapterTitle.trim()}
                                className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium text-sm transition disabled:opacity-40"
                            >
                                Create Chapter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
