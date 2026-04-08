'use client';

import { useEffect, useRef } from 'react';
import { dataStore, Notification, CalendarEvent } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { addMinutes, isAfter, isBefore, differenceInMinutes, parse } from 'date-fns';

export function useContextualReminders() {
    const { user } = useAuth();
    const lastCheckedRef = useRef<number>(0);

    useEffect(() => {
        if (!user) return;

        const checkReminders = () => {
            const now = new Date();
            // Debounce or limit frequency
            if (now.getTime() - lastCheckedRef.current < 30000) return; // 30s
            lastCheckedRef.current = now.getTime();

            const events = dataStore.getCalendarEvents();
            const notifications = dataStore.getNotifications(user.uid);

            events.forEach((event: CalendarEvent) => {
                if (event.completed) return;

                // 1. Upcoming Session Reminder (Starts in less than 30 mins, but not started)
                if (event.time) {
                    try {
                        const [hours, minutes] = event.time.split(':').map(Number);
                        const eventStart = new Date(event.date);
                        eventStart.setHours(hours, minutes, 0, 0);

                        const diffMins = differenceInMinutes(eventStart, now);

                        // If starting in 0-30 minutes
                        if (diffMins > 0 && diffMins <= 30) {
                            const notifId = `reminder_upcoming_${event.id}`;
                            const exists = notifications.some(n => n.id === notifId);

                            if (!exists) {
                                dataStore.addNotification({
                                    id: notifId,
                                    userId: user.uid,
                                    type: 'session_reminder',
                                    title: 'Upcoming Session',
                                    message: `"${event.title}" starts in ${diffMins} minutes!`,
                                    read: false,
                                    createdAt: new Date(),
                                    actionUrl: `/calendar`
                                });
                            }
                        }

                        // 2. Post-Session Feedback Reminder (Finished recently)
                        // Assuming session lasts ~1 hour for now if duration not specified
                        const eventEnd = addMinutes(eventStart, 60);
                        const diffEndMins = differenceInMinutes(now, eventEnd);

                        if (diffEndMins > 0 && diffEndMins <= 60) {
                            const notifId = `reminder_post_${event.id}`;
                            const exists = notifications.some(n => n.id === notifId);

                            if (!exists) {
                                dataStore.addNotification({
                                    id: notifId,
                                    userId: user.uid,
                                    type: 'feedback_added',
                                    title: 'Session Complete?',
                                    message: `How was "${event.title}"? Add your notes and rating.`,
                                    read: false,
                                    createdAt: new Date(),
                                    actionUrl: event.sessionId ? `/session/${event.sessionId}` : `/calendar`
                                });
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors on mock data
                        console.warn("Failed to parse event time", event, e);
                    }
                }
            });
        };

        // Run immediately
        checkReminders();

        // Poll every minute
        const interval = setInterval(checkReminders, 60000);
        return () => clearInterval(interval);

    }, [user]);
}
