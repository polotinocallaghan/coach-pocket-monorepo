'use client';

import { useEffect, useRef } from 'react';
import { dataStore } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@coach-pocket/core';

export function useNetworkNotifier() {
    const { user } = useAuth();
    const loadedRefs = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        // 1. Listen for Connection Requests
        const qRequests = query(
            collection(db, 'connections'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const notifId = `req_notif_${change.doc.id}`;

                    const existingNotifications = dataStore.getNotifications(user.uid);
                    const alreadyExists = existingNotifications.some(n => n.id === notifId);

                    if (!alreadyExists) {
                        dataStore.addNotification({
                            id: notifId,
                            userId: user.uid,
                            type: 'invite',
                            title: 'New Connection Request',
                            message: `${data.requesterName || 'A coach'} wants to connect on your network.`,
                            read: false,
                            createdAt: new Date(),
                            actionUrl: '/network'
                        });
                    }
                }
            });
        });

        // 2. Listen for Chat Messages (Using multiple listeners per active connection)
        // We first need to query accepted connections to know who to listen to
        let connectionListeners: (() => void)[] = [];

        const qConnections = query(
            collection(db, 'connections'),
            where('status', '==', 'accepted')
        );

        const unsubscribeConnections = onSnapshot(qConnections, (snapshot) => {
            // Clear existing message listeners to avoid duplicates
            connectionListeners.forEach(unsub => unsub());
            connectionListeners = [];

            const acceptedDocs = snapshot.docs.filter(d => {
                const data = d.data();
                return data.requesterId === user.uid || data.recipientId === user.uid;
            });

            acceptedDocs.forEach((docSnap) => {
                const data = docSnap.data();
                const partnerId = data.requesterId === user.uid ? data.recipientId : data.requesterId;
                const chatId = [user.uid, partnerId].sort().join('_');

                const qMessages = query(collection(db, `chats/${chatId}/messages`), where('participants', 'array-contains', user.uid));

                let isInitialLoad = true;

                const unsubMsg = onSnapshot(qMessages, (msgSnapshot) => {
                    if (isInitialLoad) {
                        isInitialLoad = false;
                        return; // Only notify on NEW additions, skip existing history
                    }

                    msgSnapshot.docChanges().forEach((msgChange) => {
                        if (msgChange.type === 'added') {
                            const msgData = msgChange.doc.data();

                            // Only trigger if NOT the current user sending it
                            if (msgData.senderId !== user.uid) {
                                const notifId = `msg_notif_${msgChange.doc.id}`;
                                const existing = dataStore.getNotifications(user.uid);

                                if (!existing.some(n => n.id === notifId)) {
                                    dataStore.addNotification({
                                        id: notifId,
                                        userId: user.uid,
                                        type: 'feedback_added', // Reusing matching interface icon type or direct
                                        title: 'New Message',
                                        message: `You received a new direct message.`,
                                        read: false,
                                        createdAt: new Date(),
                                        actionUrl: '/network'
                                    });
                                }
                            }
                        }
                    });
                });

                connectionListeners.push(unsubMsg);
            });
        });

        return () => {
            unsubscribeRequests();
            unsubscribeConnections();
            connectionListeners.forEach(unsub => unsub());
        };

    }, [user]);
}
