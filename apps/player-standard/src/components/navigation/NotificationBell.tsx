'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Calendar as CalendarIcon, MessageSquare, UserPlus, Info } from 'lucide-react';
import { dataStore, Notification } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user } = useAuth();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const loadNotifications = () => {
        if (!user) return;
        const allNotifs = dataStore.getNotifications(user.uid);
        setNotifications(allNotifs);
    };

    // Quick polling / load on mount
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000); // Check every 5s for demo
        return () => clearInterval(interval);
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkRead = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dataStore.markNotificationRead(id);
        loadNotifications();
    };

    const handleMarkAllRead = () => {
        if (!user) return;
        dataStore.markAllNotificationsRead(user.uid);
        loadNotifications();
    };

    const handleClear = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dataStore.clearNotification(id);
        loadNotifications();
    };

    const handleNotificationClick = (actionUrl?: string) => {
        if (actionUrl) {
            router.push(actionUrl);
            setIsOpen(false);
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'session_reminder': return <CalendarIcon className="w-4 h-4 text-blue-400" />;
            case 'feedback_added': return <MessageSquare className="w-4 h-4 text-green-400" />;
            case 'invite': return <UserPlus className="w-4 h-4 text-purple-400" />;
            case 'system': return <Info className="w-4 h-4 text-slate-400" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-700/50 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 flex h-4 w-4"
                    >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[100]"
                    >
                        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80 backdrop-blur-sm">
                            <h3 className="font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-medium text-slate-400 hover:text-green-400 flex items-center gap-1 transition-colors"
                                >
                                    <Check className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                                    <Bell className="w-8 h-8 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">You're all caught up!</p>
                                    <p className="text-xs mt-1 opacity-70">No new notifications.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/30">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif.actionUrl)}
                                            className={cn(
                                                "p-4 hover:bg-slate-700/50 transition-colors group cursor-pointer relative",
                                                !notif.read ? "bg-slate-700/20" : ""
                                            )}
                                        >
                                            {!notif.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r-full" />
                                            )}
                                            <div className="flex gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                                                    !notif.read ? "bg-slate-700" : "bg-slate-800"
                                                )}>
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <p className={cn("text-sm font-medium mb-0.5", !notif.read ? "text-slate-200" : "text-slate-400")}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-sm text-slate-400 leading-snug line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Hover Actions */}
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 backdrop-blur rounded-lg shadow p-1">
                                                {!notif.read && (
                                                    <button
                                                        onClick={(e) => handleMarkRead(e, notif.id)}
                                                        className="p-1.5 hover:bg-green-500/20 text-slate-400 hover:text-green-400 rounded-md transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleClear(e, notif.id)}
                                                    className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                                                    title="Remove notification"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
