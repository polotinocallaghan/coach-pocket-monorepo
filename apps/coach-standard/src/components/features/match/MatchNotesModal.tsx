'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Save, TrendingUp, Mic, Square, Trash2, Play } from 'lucide-react';

interface MatchNotesModalProps {
    matchTitle: string;
    initialNotes: string;
    onClose: () => void;
    onSave: (notes: string) => void;
    onOpenChartingTool: () => void;
}

export default function MatchNotesModal({
    matchTitle,
    initialNotes,
    onClose,
    onSave,
    onOpenChartingTool
}: MatchNotesModalProps) {
    const [notes, setNotes] = useState(initialNotes);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                // Clean up stream tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please ensure permissions are granted.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const deleteRecording = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setRecordingTime(0);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        // If there's an audio recording, we would normally upload it here.
        // For this demo, we'll append a note about the audio file.
        let finalNotes = notes;
        if (audioUrl) {
            // In a real app, you'd upload audioBlob to storage and get a URL
            // Here we just indicate it in the text
            finalNotes += `\n\n[🎤 Audio Note Recorded - Duration: ${formatTime(recordingTime)}]`;

            // Auto-download the audio for the user (since we don't have backend storage)
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = `match-note-${new Date().toISOString()}.webm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        onSave(finalNotes);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl border border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Match Notes</h2>
                        <p className="text-slate-400 text-sm mt-1">{matchTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-300 text-sm">
                            <p className="font-medium text-white mb-1">Detailed Match Charting</p>
                            Use the charting tool to track points, shots, and statistics point-by-point.
                        </div>
                        <button
                            onClick={onOpenChartingTool}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-lg shadow-blue-500/10 font-medium"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Chart Match
                        </button>
                    </div>

                    {/* Audio Recorder Section */}
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/50">
                        <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Mic className="w-4 h-4 text-slate-400" />
                            Voice Note
                        </label>

                        <div className="flex items-center gap-4">
                            {!audioUrl ? (
                                <>
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 rounded-full flex items-center gap-2 transition"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            Record Audio
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="px-4 py-2 bg-slate-600 text-white hover:bg-slate-500 rounded-full flex items-center gap-2 transition"
                                        >
                                            <Square className="w-3 h-3 fill-current" />
                                            Stop Recording ({formatTime(recordingTime)})
                                        </button>
                                    )}
                                    {isRecording && (
                                        <div className="flex gap-1 items-center h-4">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="w-1 bg-green-500 rounded-full animate-bounce" style={{ height: Math.random() * 16 + 4 + 'px', animationDelay: i * 0.1 + 's' }} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-3 w-full">
                                    <audio src={audioUrl} controls className="h-8 flex-1 opacity-80" />
                                    <button
                                        onClick={deleteRecording}
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition"
                                        title="Delete recording"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <label className="block text-sm font-medium text-slate-300 mb-2">General Notes & Observations</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Type your match analysis, strategy notes, and player feedback here..."
                            className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition resize-none leading-relaxed"
                            autoFocus={!isRecording}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 flex justify-end gap-3 shrink-0 bg-slate-800 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-2 shadow-lg shadow-green-500/20"
                    >
                        <Save className="w-4 h-4" />
                        Save Notes
                    </button>
                </div>
            </div>
        </div>
    );
}
