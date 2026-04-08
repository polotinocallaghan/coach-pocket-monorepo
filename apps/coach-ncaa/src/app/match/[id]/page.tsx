'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dataStore, CalendarEvent, CalendarSource, VideoClip, LearningChapter } from '@coach-pocket/core';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Trophy, Clock, Video, FileText, BarChart3,
    Upload, Plus, X, Save, Edit2, Trash2,
    Target, Zap, AlertTriangle, Award, ChevronDown,
    Play, Pause, Users, Scissors
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@coach-pocket/core';
import { uploadVideoFile } from '@coach-pocket/core';
import VideoFeedback from '@/components/features/match/VideoFeedback';

export default function MatchDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const matchId = params.id as string;
    const { user } = useAuth();

    const [matchEvent, setMatchEvent] = useState<CalendarEvent | null>(() => {
        const events = dataStore.getCalendarEvents();
        return events.find(e => e.id === matchId) || null;
    });

    const player = useMemo(() => {
        if (!matchEvent?.sourceId) return null;
        return dataStore.getCalendarSources().find(s => s.id === matchEvent.sourceId);
    }, [matchEvent]);

    // State for editing
    const [isEditing, setIsEditing] = useState(false);
    const [editScore, setEditScore] = useState(matchEvent?.score || '');
    const [editOpponent, setEditOpponent] = useState(matchEvent?.opponent || '');
    const [editResult, setEditResult] = useState<'win' | 'loss' | 'draw' | ''>(matchEvent?.result || '');
    const [editSurface, setEditSurface] = useState(matchEvent?.surface || '');
    const [editNotes, setEditNotes] = useState(matchEvent?.notes || '');
    const [editVideoUrl, setEditVideoUrl] = useState(matchEvent?.videoUrl || '');

    // Match notes (timestamped)
    const [matchNotes, setMatchNotes] = useState<{ timestamp: string; text: string }[]>(matchEvent?.matchNotes || []);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteTime, setNewNoteTime] = useState('');

    // Match stats
    const [matchStats, setMatchStats] = useState(matchEvent?.matchStats || {});

    // Video upload
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState(matchEvent?.videoUrl || '');
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Video clips & chapters
    const [videoClips, setVideoClips] = useState<VideoClip[]>(matchEvent?.videoClips || []);
    const [learningChapters, setLearningChapters] = useState<LearningChapter[]>(matchEvent?.learningChapters || []);

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) {
            if (!user) alert("You must be logged in to upload videos.");
            return;
        }

        try {
            setIsUploadingVideo(true);
            setUploadProgress(0);
            
            // Generate a local preview instantly
            const previewUrl = URL.createObjectURL(file);
            setLocalVideoUrl(previewUrl);

            // Upload directly to Firebase Storage
            const permanentUrl = await uploadVideoFile(user.uid, matchId, file, (progress) => {
                setUploadProgress(progress);
            });

            setEditVideoUrl(permanentUrl);
            setLocalVideoUrl(permanentUrl);

            // Save immediately to calendar event
            if (matchEvent) {
                const updates = { videoUrl: permanentUrl };
                dataStore.updateCalendarEvent(matchEvent.id, updates);
                setMatchEvent(prev => prev ? { ...prev, ...updates } : null);
            }
        } catch (error) {
            console.error("Failed to upload video:", error);
            alert("Failed to upload video. Please try again.");
            setLocalVideoUrl(matchEvent?.videoUrl || '');
        } finally {
            setIsUploadingVideo(false);
            setUploadProgress(0);
        }
    };

    const handleSave = () => {
        if (!matchEvent) return;
        const updates: Partial<CalendarEvent> = {
            score: editScore,
            opponent: editOpponent,
            result: editResult as any,
            surface: editSurface as any,
            notes: editNotes,
            videoUrl: editVideoUrl || localVideoUrl,
            matchNotes,
            matchStats,
            videoClips,
            learningChapters,
        };
        dataStore.updateCalendarEvent(matchEvent.id, updates);
        setMatchEvent(prev => prev ? { ...prev, ...updates } : null);
        setIsEditing(false);
    };

    const addMatchNote = () => {
        if (!newNoteText.trim()) return;
        const note = {
            timestamp: newNoteTime || format(new Date(), 'HH:mm'),
            text: newNoteText.trim(),
        };
        setMatchNotes(prev => [...prev, note]);
        setNewNoteText('');
        setNewNoteTime('');
    };

    const removeMatchNote = (index: number) => {
        setMatchNotes(prev => prev.filter((_, i) => i !== index));
    };

    const updateStat = (key: string, value: any) => {
        setMatchStats(prev => ({ ...prev, [key]: value }));
    };

    if (!matchEvent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Match not found</h2>
                    <p className="text-sm text-slate-400 mb-4">This match event doesn't exist or has been deleted.</p>
                    <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    const resultColor = matchEvent.result === 'win' ? 'text-green-400' : matchEvent.result === 'loss' ? 'text-red-400' : 'text-yellow-400';
    const resultBg = matchEvent.result === 'win' ? 'bg-green-500/10 border-green-500/20' : matchEvent.result === 'loss' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';

    return (
        <div className="pb-24 animate-in fade-in duration-500">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-slate-900 to-indigo-600/10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

                <div className="relative max-w-[1400px] mx-auto px-6 pt-6 pb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                    </button>

                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-5">
                            {/* Match Icon */}
                            <div className="w-20 h-20 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                <Trophy className="w-10 h-10 text-purple-400" />
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl font-bold text-white">{matchEvent.title}</h1>
                                    {matchEvent.result && (
                                        <span className={cn(
                                            "text-xs uppercase font-bold px-3 py-1 rounded-full border",
                                            resultBg, resultColor
                                        )}>
                                            {matchEvent.result === 'win' ? '🏆 Victory' : matchEvent.result === 'loss' ? 'Defeat' : 'Draw'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(new Date(matchEvent.date), 'EEEE, MMM d, yyyy')}
                                        {matchEvent.time && ` · ${matchEvent.time}`}
                                    </span>
                                    {player && (
                                        <button
                                            onClick={() => router.push(`/player/${player.id}`)}
                                            className="flex items-center gap-1.5 hover:text-purple-400 transition"
                                        >
                                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white", player.color || "bg-purple-500")}>
                                                {player.initials || player.name[0]}
                                            </div>
                                            {player.name}
                                        </button>
                                    )}
                                    {matchEvent.opponent && (
                                        <span className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            vs {matchEvent.opponent}
                                        </span>
                                    )}
                                    {matchEvent.surface && (
                                        <span className="bg-slate-700/60 px-2 py-0.5 rounded text-xs capitalize">
                                            {matchEvent.surface}
                                        </span>
                                    )}
                                </div>

                                {matchEvent.score && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <span className="text-3xl font-bold text-white tracking-wider">{matchEvent.score}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Edit Button */}
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition text-sm font-medium border",
                                isEditing
                                    ? "bg-purple-500 text-white border-purple-500"
                                    : "bg-slate-800/60 text-slate-300 border-slate-700 hover:border-purple-500/50"
                            )}
                        >
                            <Edit2 className="w-4 h-4" />
                            {isEditing ? 'Editing...' : 'Edit Match'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-6">
                {/* Edit Panel */}
                {isEditing && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 mb-6 animate-in slide-in-from-top duration-300">
                        <h3 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <Edit2 className="w-4 h-4" />
                            Edit Match Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Opponent</label>
                                <input
                                    type="text"
                                    value={editOpponent}
                                    onChange={e => setEditOpponent(e.target.value)}
                                    placeholder="e.g. Rafael Nadal"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Score</label>
                                <input
                                    type="text"
                                    value={editScore}
                                    onChange={e => setEditScore(e.target.value)}
                                    placeholder="e.g. 6-4, 3-6, 7-5"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Result</label>
                                <div className="flex gap-2">
                                    {(['win', 'loss', 'draw'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setEditResult(r)}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-xs font-bold capitalize transition border",
                                                editResult === r
                                                    ? r === 'win' ? 'bg-green-500/20 text-green-400 border-green-500/40'
                                                        : r === 'loss' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
                                            )}
                                        >
                                            {r === 'win' ? '🏆 Win' : r === 'loss' ? '❌ Loss' : '🤝 Draw'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Surface</label>
                                <div className="flex gap-1.5">
                                    {(['hard', 'clay', 'grass', 'indoor'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setEditSurface(s)}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-[10px] font-bold capitalize transition border",
                                                editSurface === s
                                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                                    : 'bg-slate-800 text-slate-500 border-slate-700'
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 block mb-1">General Notes</label>
                            <textarea
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Overall match observations..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 h-20 resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium text-sm transition"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Video + Notes */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video Section - with Video Feedback when video exists */}
                        {localVideoUrl ? (
                            <>
                                {/* Video Feedback Tool */}
                                <VideoFeedback
                                    videoUrl={localVideoUrl}
                                    clips={videoClips}
                                    chapters={learningChapters}
                                    playerName={player?.name}
                                    onSave={(newClips, newChapters) => {
                                        setVideoClips(newClips);
                                        setLearningChapters(newChapters);
                                        if (matchEvent) {
                                            const updates = {
                                                videoClips: newClips,
                                                learningChapters: newChapters,
                                                videoUrl: localVideoUrl,
                                            };
                                            dataStore.updateCalendarEvent(matchEvent.id, updates);
                                            setMatchEvent(prev => prev ? { ...prev, ...updates } : null);
                                        }
                                    }}
                                />

                                {/* Remove video button when editing */}
                                {isEditing && (
                                    <button
                                        onClick={() => { setLocalVideoUrl(''); setEditVideoUrl(''); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-medium border border-red-500/20 transition w-full justify-center"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove Video
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                                <div className="p-5 border-b border-slate-700">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Video className="w-4 h-4 text-purple-400" />
                                        Match Video
                                    </h3>
                                </div>
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
                                        <Video className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 text-sm mb-1">No video uploaded yet</p>
                                    <p className="text-[10px] text-slate-600 mb-4">Upload a video to unlock clip creation, feedback notes, and learning chapters</p>
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleVideoUpload}
                                        className="hidden"
                                        disabled={isUploadingVideo}
                                    />
                                    <button
                                        onClick={() => videoInputRef.current?.click()}
                                        disabled={isUploadingVideo}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition",
                                            isUploadingVideo 
                                                ? "bg-purple-500/10 text-purple-400/50 border-purple-500/10 cursor-not-allowed" 
                                                : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30"
                                        )}
                                    >
                                        <Upload className="w-4 h-4" />
                                        {isUploadingVideo ? `Uploading... ${uploadProgress}%` : 'Upload Match Video'}
                                    </button>
                                    <div className="flex items-center gap-3 mt-4">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                            <Scissors className="w-3 h-3" />
                                            Create clips
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                            <FileText className="w-3 h-3" />
                                            Add coach notes
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                            <Award className="w-3 h-3" />
                                            Learning chapters
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live Courtside Notes — taken during the match */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    🎾 Live Courtside Notes
                                    <span className="text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">During Match</span>
                                </h3>
                                <span className="text-xs text-slate-500">{matchNotes.length} notes</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mb-4">Real-time observations taken courtside while watching the match live</p>

                            {/* Add Note */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newNoteTime}
                                    onChange={e => setNewNoteTime(e.target.value)}
                                    placeholder="Set/Game"
                                    className="w-24 px-2 py-2 bg-slate-800/80 border border-emerald-500/20 rounded-lg text-white text-xs text-center focus:outline-none focus:border-emerald-500"
                                />
                                <input
                                    type="text"
                                    value={newNoteText}
                                    onChange={e => setNewNoteText(e.target.value)}
                                    placeholder="e.g. Not moving feet on return, staying too passive..."
                                    className="flex-1 px-3 py-2 bg-slate-800/80 border border-emerald-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    onKeyDown={e => e.key === 'Enter' && addMatchNote()}
                                />
                                <button
                                    onClick={addMatchNote}
                                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition border border-emerald-500/30"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Notes List */}
                            {matchNotes.length === 0 ? (
                                <div className="text-center py-6 text-slate-500">
                                    <FileText className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No courtside notes yet.</p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">Jot down what you see while the match is happening</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {matchNotes.map((note, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-800/60 rounded-lg px-3 py-2.5 group border border-emerald-500/10">
                                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                                                {note.timestamp}
                                            </span>
                                            <p className="text-sm text-slate-300 flex-1">{note.text}</p>
                                            <button
                                                onClick={() => removeMatchNote(i)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition p-1"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Save notes button */}
                            {matchNotes.length > 0 && (
                                <button
                                    onClick={handleSave}
                                    className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition border border-emerald-500/20"
                                >
                                    <Save className="w-3 h-3 inline mr-1" />
                                    Save Courtside Notes
                                </button>
                            )}
                        </div>

                        {/* General Notes */}
                        {matchEvent.notes && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    Post-Match Observations
                                </h3>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{matchEvent.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Stats + Info */}
                    <div className="space-y-6">
                        {/* Match Result Card */}
                        <div className={cn(
                            "rounded-2xl p-6 border",
                            matchEvent.result
                                ? resultBg
                                : "bg-slate-800/50 border-slate-700"
                        )}>
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Award className="w-4 h-4 text-yellow-400" />
                                Match Result
                            </h3>

                            {matchEvent.result ? (
                                <div className="text-center py-4">
                                    <div className="text-4xl mb-2">
                                        {matchEvent.result === 'win' ? '🏆' : matchEvent.result === 'loss' ? '😤' : '🤝'}
                                    </div>
                                    <div className={cn("text-xl font-bold uppercase", resultColor)}>
                                        {matchEvent.result}
                                    </div>
                                    {matchEvent.score && (
                                        <div className="text-2xl font-bold text-white mt-2">{matchEvent.score}</div>
                                    )}
                                    {matchEvent.opponent && (
                                        <div className="text-sm text-slate-400 mt-2">vs {matchEvent.opponent}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500">
                                    <p className="text-xs">No result recorded yet</p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="mt-2 text-purple-400 text-xs hover:text-purple-300"
                                    >
                                        Add result →
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Match Stats */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-emerald-400" />
                                Match Statistics
                            </h3>

                            <div className="space-y-3">
                                {[
                                    { key: 'aces', label: 'Aces', icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
                                    { key: 'doubleFaults', label: 'Double Faults', icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> },
                                    { key: 'winners', label: 'Winners', icon: <Target className="w-3.5 h-3.5 text-green-400" /> },
                                    { key: 'unforcedErrors', label: 'Unforced Errors', icon: <X className="w-3.5 h-3.5 text-orange-400" /> },
                                    { key: 'firstServePercent', label: '1st Serve %', icon: <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> },
                                ].map(stat => (
                                    <div key={stat.key} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {stat.icon}
                                            <span className="text-xs text-slate-300">{stat.label}</span>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={matchStats[stat.key] ?? ''}
                                                onChange={e => updateStat(stat.key, e.target.value ? Number(e.target.value) : undefined)}
                                                className="w-16 text-right px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                                                placeholder="--"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-white">
                                                {matchStats[stat.key] !== undefined ? (stat.key === 'firstServePercent' ? `${matchStats[stat.key]}%` : matchStats[stat.key]) : '--'}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {/* Break Points */}
                                <div className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-xs text-slate-300">Break Points Won</span>
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={matchStats.breakPointsWon ?? ''}
                                            onChange={e => updateStat('breakPointsWon', e.target.value)}
                                            className="w-16 text-right px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                                            placeholder="e.g. 3/5"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-white">
                                            {matchStats.breakPointsWon || '--'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Match Info */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Match Info
                            </h3>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Date</span>
                                    <span className="text-white">{format(new Date(matchEvent.date), 'MMM d, yyyy')}</span>
                                </div>
                                {matchEvent.time && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Time</span>
                                        <span className="text-white">{matchEvent.time}</span>
                                    </div>
                                )}
                                {matchEvent.surface && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Surface</span>
                                        <span className="text-white capitalize">{matchEvent.surface}</span>
                                    </div>
                                )}
                                {player && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Player</span>
                                        <button
                                            onClick={() => router.push(`/player/${player.id}`)}
                                            className="text-purple-400 hover:text-purple-300 transition"
                                        >
                                            {player.name} →
                                        </button>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status</span>
                                    <span className={cn(
                                        "text-xs font-bold uppercase px-2 py-0.5 rounded-full",
                                        matchEvent.completed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                    )}>
                                        {matchEvent.completed ? 'Completed' : 'Upcoming'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
