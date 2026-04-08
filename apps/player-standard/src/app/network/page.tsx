'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Users, Briefcase, Send, Search, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, or, and, setDoc } from 'firebase/firestore';
import { db } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';

interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role?: string;
}

interface ConnectionRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    requesterEmail: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'rejected';
}

interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: any;
}

export default function CoachNetworkPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'messages' | 'find-coaches' | 'requests'>('messages');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<AppUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState('');

    // Connections State
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);
    const [connections, setConnections] = useState<AppUser[]>([]);
    const [chatPartner, setChatPartner] = useState<AppUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Load Connections and Requests
    useEffect(() => {
        if (!user) return;

        // 1. Fetch Pending Requests (where I am the recipient)
        const qRequests = query(
            collection(db, 'connections'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectionRequest));
            setRequests(reqs);
        });

        // 2. Fetch Accepted Connections
        // This is complex in NoSQL without a separate "friends" list. 
        // We query for connections where status is 'accepted' AND (requesterId == me OR recipientId == me)
        const qConnections = query(
            collection(db, 'connections'),
            or(
                where('requesterId', '==', user.uid),
                where('recipientId', '==', user.uid)
            )
        );

        const unsubscribeConnections = onSnapshot(qConnections, async (snapshot) => {
            const acceptedDocs = snapshot.docs.filter(d => d.data().status === 'accepted');
            const connectionUserIds = acceptedDocs.map(d => {
                const data = d.data();
                return data.requesterId === user.uid ? data.recipientId : data.requesterId;
            });

            if (connectionUserIds.length > 0) {
                // Fetch user details for these IDs
                // Firestore 'in' query supports max 10/30 items. reliable for small lists.
                // For simplified demo, we might need to fetch individually or use 'in' chunks.
                // We'll trust there are few for now.
                const qUsers = query(collection(db, 'users'), where('uid', 'in', connectionUserIds.slice(0, 10)));
                const userSnaps = await getDocs(qUsers);
                const users = userSnaps.docs.map(doc => doc.data() as AppUser);
                setConnections(users);
            } else {
                setConnections([]);
            }
        });

        return () => {
            unsubscribeRequests();
            unsubscribeConnections();
        };
    }, [user]);

    // Chat Listener
    useEffect(() => {
        if (!user || !chatPartner) return;

        const chatId = [user.uid, chatPartner.uid].sort().join('_');
        const qChat = query(
            collection(db, `chats/${chatId}/messages`),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribeChat = onSnapshot(qChat, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            // Client-side sort fallback
            msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setMessages(msgs);
        });

        return () => unsubscribeChat();
    }, [user, chatPartner]);

    // Load Initial Coaches for discovery
    useEffect(() => {
        if (!user || activeTab !== 'find-coaches') return;

        const loadSuggestions = async () => {
            setIsSearching(true);
            try {
                // Query all users with role 'coach'
                const q = query(collection(db, 'users'), where('role', '==', 'coach'));
                const snap = await getDocs(q);
                let list = snap.docs.map(d => d.data() as AppUser);

                // Exclude already connected/requested/self
                const connectedIds = connections.map(c => c.uid);
                const requestedIds = requests.map(r => r.requesterId === user.uid ? r.recipientId : r.requesterId);

                list = list.filter(u =>
                    u.uid !== user.uid &&
                    !connectedIds.includes(u.uid) &&
                    !requestedIds.includes(u.uid)
                );

                // Safe check against multiple items
                setSearchResults(list);
                if (list.length === 0) {
                    setSearchMessage('No other coaches found. Use Search to find by email.');
                } else {
                    setSearchMessage('');
                }
            } catch (error) {
                console.error("Failed to load initial coaches:", error);
            } finally {
                setIsSearching(false);
            }
        };

        loadSuggestions();
    }, [activeTab, user]);


    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        setSearchMessage('');
        setSearchResults([]);

        try {
            const normalizedTerm = searchTerm.trim().toLowerCase();
            console.log("Searching for:", normalizedTerm);

            // Fetch all for safe fuzzy match and casing compliance
            const qAll = query(collection(db, 'users'));
            const snap = await getDocs(qAll);
            const list = snap.docs.map(d => d.data() as AppUser);

            let results = list.filter(u =>
                u.email?.toLowerCase() === normalizedTerm ||
                u.displayName?.toLowerCase().includes(normalizedTerm)
            );

            console.log("Results found:", results);

            // Filter out self
            results = results.filter(u => u.uid !== user?.uid);

            if (results.length === 0) {
                setSearchMessage('No user found matching that identifier.');
            } else {
                setSearchResults(results);
            }

        } catch (error) {
            console.error("Search error:", error);
            setSearchMessage('Error searching for users.');
        } finally {
            setIsSearching(false);
        }
    };

    const sendConnectionRequest = async (targetUser: AppUser) => {
        if (!user) return;
        try {
            // Check if request already exists
            const qExists = query(
                collection(db, 'connections'),
                where('requesterId', '==', user.uid),
                where('recipientId', '==', targetUser.uid)
            );
            const existsSnap = await getDocs(qExists);
            if (!existsSnap.empty) {
                alert('Request already sent.');
                return;
            }

            await addDoc(collection(db, 'connections'), {
                requesterId: user.uid,
                requesterName: user.displayName || user.email,
                requesterEmail: user.email,
                recipientId: targetUser.uid,
                status: 'pending',
                createdAt: new Date()
            });
            alert('Request sent!');
            setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid)); // Remove from results
        } catch (error) {
            console.error("Error sending request:", error);
            alert('Failed to send request.');
        }
    };

    const handleAcceptRequest = async (reqId: string) => {
        try {
            await updateDoc(doc(db, 'connections', reqId), {
                status: 'accepted'
            });
        } catch (error) {
            console.error("Error accepting request:", error);
        }
    };

    const handleRejectRequest = async (reqId: string) => {
        try {
            await updateDoc(doc(db, 'connections', reqId), {
                status: 'rejected'
            });
        } catch (error) {
            console.error("Error rejecting request:", error);
        }
    };

    const sendMessage = async () => {
        if (!user || !chatPartner || !newMessage.trim()) return;

        const chatId = [user.uid, chatPartner.uid].sort().join('_');
        try {
            await setDoc(doc(db, 'chats', chatId), {
                participants: [user.uid, chatPartner.uid],
                updatedAt: new Date()
            }, { merge: true });

            await addDoc(collection(db, `chats/${chatId}/messages`), {
                senderId: user.uid,
                receiverId: chatPartner.uid,
                participants: [user.uid, chatPartner.uid],
                content: newMessage,
                createdAt: new Date()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Coach Network</h1>
                                <p className="text-sm text-slate-400">Connect & Chat</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'messages'
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </button>
                    <button
                        onClick={() => setActiveTab('find-coaches')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'find-coaches'
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        Find Coaches
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'requests'
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        Requests
                        {requests.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
                        )}
                    </button>
                </div>

                {/* CONTENT: FIND COACHES */}
                {activeTab === 'find-coaches' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h2 className="text-xl font-bold mb-4">Search for Coaches</h2>
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Enter email address..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Search
                                </button>
                            </div>

                            {searchMessage && <p className="text-slate-400 text-center mb-4">{searchMessage}</p>}

                            <div className="space-y-4">
                                {searchResults.map((result) => (
                                    <div key={result.uid} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {result.displayName?.[0] || result.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{result.displayName || 'User'}</h3>
                                                <p className="text-sm text-slate-400">{result.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendConnectionRequest(result)}
                                            className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition"
                                        >
                                            <UserPlus className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTENT: REQUESTS */}
                {activeTab === 'requests' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        <h2 className="text-xl font-bold mb-4">Connection Requests</h2>
                        {requests.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No pending requests.</p>
                        ) : (
                            requests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
                                    <div>
                                        <h3 className="font-bold text-white">{req.requesterName}</h3>
                                        <p className="text-sm text-slate-400">{req.requesterEmail}</p>
                                        <p className="text-xs text-slate-500 mt-1">Sent you a connection request</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptRequest(req.id)}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition"
                                        >
                                            <Check className="w-4 h-4" /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleRejectRequest(req.id)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2 transition"
                                        >
                                            <X className="w-4 h-4" /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* CONTENT: MESSAGES (CHAT) */}
                {activeTab === 'messages' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                        {/* Sidebar: Connections List */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-700">
                                <h3 className="font-bold text-white">Your Connections</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {connections.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-8 px-4">
                                        No connections yet. Go to "Find Coaches" to add people!
                                    </p>
                                ) : (
                                    connections.map((conn) => (
                                        <div
                                            key={conn.uid}
                                            onClick={() => setChatPartner(conn)}
                                            className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700 transition flex items-center gap-3 ${chatPartner?.uid === conn.uid ? 'bg-slate-700' : ''}`}
                                        >
                                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                                {conn.displayName?.[0] || conn.email[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-bold text-white truncate">{conn.displayName || 'User'}</h4>
                                                <p className="text-xs text-slate-400 truncate">{conn.email}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                            {chatPartner ? (
                                <>
                                    <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-750">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {chatPartner.displayName?.[0] || chatPartner.email[0].toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-white">{chatPartner.displayName || chatPartner.email}</h3>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                                        {messages.length === 0 && (
                                            <p className="text-center text-slate-500 py-12">Start a conversation!</p>
                                        )}
                                        {messages.map((msg) => {
                                            const isMe = msg.senderId === user?.uid;
                                            return (
                                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe
                                                        ? 'bg-green-500 text-slate-900 font-medium rounded-br-none shadow-md shadow-green-500/10'
                                                        : 'bg-slate-700 text-white rounded-bl-none border border-slate-600'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    {msg.createdAt && msg.createdAt.seconds && (
                                                        <span className="text-[10px] text-slate-500 mt-1 px-2">
                                                            {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="p-4 border-t border-slate-700 bg-slate-800">
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                sendMessage();
                                            }}
                                            className="flex gap-2"
                                        >
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type a message..."
                                                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Select a connection to start chatting</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
