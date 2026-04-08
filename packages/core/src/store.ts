// Mock data store for immediate functionality
// localStorage for instant reads + Firestore for cross-device persistence

import {
    fsGetProfile, fsSetProfile,
    fsListenExercises, fsAddExercise, fsUpdateExercise, fsDeleteExercise, fsBatchWriteExercises,
    fsListenSessions, fsAddSession, fsUpdateSession, fsDeleteSession,
    fsListenCalendarEvents, fsAddCalendarEvent, fsUpdateCalendarEvent, fsDeleteCalendarEvent, fsDeleteCalendarEventsByGroup,
    fsListenPlaylists, fsAddPlaylist, fsDeletePlaylist,
    fsListenTeams, fsAddTeam, fsUpdateTeam, fsDeleteTeam, fsBatchWriteTeams,
    fsListenPrograms, fsAddProgram, fsUpdateProgram, fsDeleteProgram,
    fsListenNotebookNotes, fsSetNotebookNote, fsDeleteNotebookNote,
    fsListenCoachCalendarEvents, fsListenCoachSessions, fsListenCoachExercises, fsListenCoachNotesForPlayer,
    fsListenNotifications, fsAddNotification, fsUpdateNotificationRead
} from './firebase/firestoreService';
import { Unsubscribe } from 'firebase/firestore';

const STORAGE_KEYS = {
    exercises: 'coach_pocket_exercises',
    sessions: 'coach_pocket_sessions',
    calendar: 'coach_pocket_calendar',
    playlists: 'coach_pocket_playlists',
    teams: 'coach_pocket_teams',
    calendarSources: 'coach_pocket_calendar_sources',
    notifications: 'coach_pocket_notifications'
};

import {
    Exercise,
    Session,
    SessionExercise,
    CalendarSource,
    VideoClip,
    LearningChapter,
    CalendarEvent,
    Playlist,
    Team,
    TeamMember,
    Message,
    Group,
    Opportunity,
    TrainingPreferenceFeature,
    TrainingPreferences,
    UserProfile,
    NotebookNote,
    Notification,
    WeekDay,
    ProgramWeek,
    TrainingProgram
} from "./types";

// In-memory data store (replace with API calls later)
class DataStore {
    private exercises: Exercise[] = [];
    private sessions: Session[] = [];
    private calendar: CalendarEvent[] = [];
    private playlists: Playlist[] = [];
    private teams: Team[] = [];
    private programs: TrainingProgram[] = [];
    private messages: Message[] = [];
    private groups: Group[] = [];
    private opportunities: Opportunity[] = [];
    private groupEvents: CalendarEvent[] = [];
    private notifications: Notification[] = [];
    private notebookNotes: NotebookNote[] = [];
    private coachNotesForPlayer: NotebookNote[] = [];
    private userProfile: UserProfile | null = null;
    private currentUserCalendarSourceColor = 'bg-green-500';

    private currentUserId: string | null = null;
    private listeners: (() => void)[] = [];
    private unsubscribers: Unsubscribe[] = [];

    constructor() {
        // Initial load from localStorage (fast, synchronous)
        this.loadFromLocalStorage();
    }

    // --- Subscription System ---
    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }

    private clearListeners() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }

    /**
     * Pull all data from Firestore and setup real-time listeners.
     * Call this once after login from AuthContext.
     */
    async syncFromFirestore(uid: string) {
        this.currentUserId = uid;
        this.clearListeners();

        try {
            // Static profile load
            const prof = await fsGetProfile(uid);
            if (prof) {
                this.userProfile = prof;
            } else {
                this.userProfile = {
                    id: uid,
                    role: 'coach',
                    name: 'Coach',
                    email: '',
                    createdAt: new Date()
                };
                await fsSetProfile(uid, this.userProfile);
            }

            // Real-time listeners
            this.unsubscribers.push(
                fsListenExercises(uid, (data) => {
                    this.exercises = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenSessions(uid, (data) => {
                    this.sessions = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenCalendarEvents(uid, (data) => {
                    this.calendar = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenPlaylists(uid, (data) => {
                    this.playlists = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenTeams(uid, (data) => {
                    this.teams = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenPrograms(uid, (data) => {
                    this.programs = data;
                    this.notify();
                })
            );



            this.unsubscribers.push(
                fsListenNotebookNotes(uid, (data) => {
                    this.notebookNotes = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            this.unsubscribers.push(
                fsListenNotifications(uid, (data) => {
                    this.notifications = data;
                    this.saveToLocalStorage();
                    this.notify();
                })
            );

            // ─── PLAYER: Subscribe to connected coach's data ───
            if (this.userProfile?.role === 'player' && this.userProfile?.connectedCoachId) {
                await this.syncCoachDataForPlayer(this.userProfile.connectedCoachId, this.userProfile.linkedPlayerId);
            }

        } catch (error) {
            console.error("Error syncing from Firestore:", error);
        }
    }

    clear() {
        this.clearListeners();
        this.currentUserId = null;
        this.userProfile = null;
        // Clear other data as well for a clean slate
        this.exercises = [];
        this.sessions = [];
        this.calendar = [];
        this.playlists = [];
        this.teams = [];
        this.programs = [];
        this.messages = [];
        this.groups = [];
        this.opportunities = [];
        this.groupEvents = [];
        this.notifications = [];
        this.notebookNotes = [];
        this.saveToLocalStorage();
        this.notify();
    }

    public initForUser(userId: string | null) {
        this.currentUserId = userId;
        this.loadFromLocalStorage();

        // If new user or new guest with no local data, ensure defaults are set
        if (!this.userProfile) {
            if (this.exercises.length === 0) {
                this.initializeSampleData();
            }

            // Clear other personally identifiable data for a clean slate
            this.sessions = [];
            this.calendar = [];
            this.playlists = [];
            this.teams = [];

            // Default profile
            this.userProfile = {
                id: this.currentUserId || 'guest',
                role: 'coach',
                name: this.currentUserId ? 'New Coach' : 'Guest Head Coach',
                email: '',
                createdAt: new Date()
            };
            this.saveToLocalStorage();
        }
    }

    public getUserProfile(): UserProfile | null {
        return this.userProfile;
    }

    public getEffectiveRole(): 'coach' | 'player' {
        return (this.userProfile?.role?.toLowerCase() as 'coach' | 'player') || 'coach';
    }

    public setUserProfile(profile: UserProfile) {
        this.userProfile = profile;
        this.saveToLocalStorage();
        this.notify();
    }

    public async updateUserProfile(updates: Partial<UserProfile>) {
        if (!this.userProfile) return;
        this.userProfile = { ...this.userProfile, ...updates };
        this.saveToLocalStorage();
        this.notify();

        if (this.currentUserId) {
            await fsSetProfile(this.currentUserId, this.userProfile);

            // If player updates their profile, ensure coach sees the update in their CalendarSource
            if (this.userProfile.role === 'player' && this.userProfile.connectedCoachId && this.userProfile.linkedPlayerId) {
                // We import fsUpdateCoachCalendarSource from firestoreService in store.ts
                const { fsUpdateCoachCalendarSource } = await import('./firebase/firestoreService');
                await fsUpdateCoachCalendarSource(
                    this.userProfile.connectedCoachId,
                    this.userProfile.linkedPlayerId,
                    { trainingPreferences: this.userProfile.trainingPreferences }
                );
            }
        }
    }

    /**
     * Subscribe to the connected coach's Firestore data.
     * Fills the player's local store with the coach's calendar, sessions,
     * exercises, and any notes written about this player.
     */
    private async syncCoachDataForPlayer(coachId: string, linkedPlayerId?: string) {
        console.log(`[Player Sync] Connecting to coach ${coachId}, linkedPlayer: ${linkedPlayerId}`);

        // Listen to coach's calendar events (filtered for this player)
        this.unsubscribers.push(
            fsListenCoachCalendarEvents(coachId, (data) => {
                this.calendar = data;
                this.saveToLocalStorage();
                this.notify();
            }, linkedPlayerId)
        );

        // Listen to coach's sessions (to resolve session details for calendar events)
        this.unsubscribers.push(
            fsListenCoachSessions(coachId, (data) => {
                this.sessions = data;
                this.saveToLocalStorage();
                this.notify();
            })
        );

        // Listen to coach's exercises (to show drill names/details)
        this.unsubscribers.push(
            fsListenCoachExercises(coachId, (data) => {
                this.exercises = data;
                this.saveToLocalStorage();
                this.notify();
            })
        );

        // Listen to coach's notebook notes about this player
        if (linkedPlayerId) {
            this.unsubscribers.push(
                fsListenCoachNotesForPlayer(coachId, linkedPlayerId, (data) => {
                    this.coachNotesForPlayer = data;
                    this.notify();
                })
            );
        }
    }

    /** Get coach notes written about the currently logged-in player */
    public getCoachNotesForPlayer(): NotebookNote[] {
        return this.coachNotesForPlayer;
    }

    private getStorageKey(key: string): string {
        const prefix = this.currentUserId ? `coach_pocket_${this.currentUserId}_` : 'coach_pocket_guest_';
        return `${prefix}${key}`;
    }

    // Save data to localStorage
    private saveToLocalStorage() {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.getStorageKey('exercises'), JSON.stringify(this.exercises));
            
            // Limit heavy arrays for faster Mobile App Boot and Hydration
            const sortedSessions = [...this.sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);
            localStorage.setItem(this.getStorageKey('sessions'), JSON.stringify(sortedSessions));
            
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentCalendar = this.calendar.filter(e => e.date.getTime() >= thirtyDaysAgo.getTime());
            localStorage.setItem(this.getStorageKey('calendar'), JSON.stringify(recentCalendar));
            
            localStorage.setItem(this.getStorageKey('playlists'), JSON.stringify(this.playlists));
            localStorage.setItem(this.getStorageKey('teams'), JSON.stringify(this.teams));
            localStorage.setItem(this.getStorageKey('programs'), JSON.stringify(this.programs));
            localStorage.setItem(this.getStorageKey('profile'), JSON.stringify(this.userProfile));
            localStorage.setItem(this.getStorageKey('notifications'), JSON.stringify(this.notifications.slice(0, 30)));
            localStorage.setItem(this.getStorageKey('notebookNotes'), JSON.stringify(this.notebookNotes));
        }
    }

    // Load data from localStorage
    private loadFromLocalStorage() {
        if (typeof window !== 'undefined') {
            try {
                const exercises = localStorage.getItem(this.getStorageKey('exercises'));
                const sessions = localStorage.getItem(this.getStorageKey('sessions'));
                const calendar = localStorage.getItem(this.getStorageKey('calendar'));
                const playlists = localStorage.getItem(this.getStorageKey('playlists'));
                const teams = localStorage.getItem(this.getStorageKey('teams'));
                const programs = localStorage.getItem(this.getStorageKey('programs'));
                const profile = localStorage.getItem(this.getStorageKey('profile'));
                const notifications = localStorage.getItem(this.getStorageKey('notifications'));
                const notebookNotes = localStorage.getItem(this.getStorageKey('notebookNotes'));

                this.userProfile = profile ? JSON.parse(profile) : null;

                if (exercises || sessions || calendar || playlists || teams || profile) {
                    this.exercises = exercises ? JSON.parse(exercises).map((e: Partial<Exercise>) => ({
                        ...e,
                        playMode: e.playMode || 'both', // backfill for cached data
                    })) : [];
                    this.sessions = sessions ? JSON.parse(sessions).map((s: Partial<Session> & { createdAt: string | Date }) => ({
                        ...s,
                        createdAt: new Date(s.createdAt)
                    })) : [];
                    this.calendar = calendar ? JSON.parse(calendar).map((e: Partial<CalendarEvent> & { date: string | Date }) => ({
                        ...e,
                        date: new Date(e.date)
                    })) : [];
                    this.playlists = playlists ? JSON.parse(playlists) : [];
                    this.teams = teams ? JSON.parse(teams) : [];
                    this.programs = programs ? JSON.parse(programs).map((p: Partial<TrainingProgram> & { startDate: string | Date, createdAt: string | Date }) => ({
                        ...p,
                        startDate: new Date(p.startDate),
                        createdAt: new Date(p.createdAt),
                    })) : [];
                    this.notifications = notifications ? JSON.parse(notifications).map((n: Partial<Notification> & { createdAt: string | Date }) => ({
                        ...n,
                        createdAt: new Date(n.createdAt)
                    })) : [];
                    this.notebookNotes = notebookNotes ? JSON.parse(notebookNotes).map((n: Partial<NotebookNote> & { createdAt: string | Date, updatedAt: string | Date }) => ({
                        ...n,
                        createdAt: new Date(n.createdAt),
                        updatedAt: new Date(n.updatedAt)
                    })) : [];
                } else {
                    // No data found for this user/guest context
                    this.exercises = [];
                    this.sessions = [];
                    this.calendar = [];
                    this.playlists = [];
                    this.teams = [];
                    this.notifications = [];
                    this.userProfile = null;
                }

            } catch (error) {
                console.error('Error loading from localStorage:', error);
                this.exercises = [];
                this.sessions = [];
                this.calendar = [];
                this.playlists = [];
                this.teams = [];
                this.notifications = [];
                this.userProfile = null;
            }
        } else {
            this.exercises = [];
            this.sessions = [];
            this.calendar = [];
            this.playlists = [];
            this.teams = [];
            this.userProfile = null;
        }
    }

    private initializeSampleData() {
        // Sample calendar events
        this.calendar = [
            {
                id: '1',
                title: 'AM',
                date: new Date('2026-02-03'),
                time: '09:00',
                type: 'session' as const,
                completed: false,
            },
        ];

        // Sample sessions - empty initially
        this.sessions = [];

        // Sample playlists - empty initially
        this.playlists = [];
        // Sample exercises - 20 varied drills with comprehensive filter data
        this.exercises = [
            {
                id: '1',
                title: 'Crosscourt Rally',
                description: 'Players hit crosscourt forehands maintaining depth and consistency',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['forehand', 'consistency'],
                playMode: 'both',
                rating: 4,
                timesUsed: 45,
                duration: 10,
                focusArea: 'Forehand',
                courtArea: 'baseline',
                tags: ['rally', 'consistency'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '2',
                title: 'Serve + 1 Attack',
                description: 'Serve, move forward, and put away the next ball with an aggressive shot',
                category: 'drill',
                drillType: 'points',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['serve', 'footwork'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 62,
                duration: 15,
                focusArea: 'Serve',
                courtArea: 'full-court',
                tags: ['serve', 'attack', 'net'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '3',
                title: 'First to 11 Points',
                description: 'Competitive game playing to 11 points, win by 2',
                category: 'game',
                drillType: 'points',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['consistency'],
                playMode: 'singles',
                rating: 4,
                timesUsed: 38,
                duration: 20,
                focusArea: 'Match Play',
                courtArea: 'full-court',
                tags: ['competitive', 'match-play'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '4',
                title: 'Volley-Volley Exchanges',
                description: 'Both players at net hitting volleys back and forth',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'teens',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['volley'],
                playMode: 'both',
                rating: 3,
                timesUsed: 28,
                duration: 8,
                focusArea: 'Volley',
                courtArea: 'service-box',
                tags: ['volley', 'net-play'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '5',
                title: 'Down-the-Line Backhand',
                description: 'Practice hitting backhand down the line with proper technique',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['backhand'],
                playMode: 'singles',
                rating: 4,
                timesUsed: 51,
                duration: 12,
                focusArea: 'Backhand',
                courtArea: 'baseline',
                tags: ['backhand', 'rally'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '6',
                title: 'Approach Shot + Volley',
                description: 'Hit an approach shot and finish at the net with a volley',
                category: 'drill',
                drillType: 'points',
                difficulty: 'hard',
                level: 'advanced',
                ageGroup: 'adults',
                needsCoach: true,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['volley', 'footwork'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 34,
                duration: 15,
                focusArea: 'Net Play',
                courtArea: 'full-court',
                tags: ['approach', 'volley', 'transition'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '7',
                title: 'Spanish Drill',
                description: 'One player runs side to side while the other controls the rally',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'hard',
                level: 'advanced',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['forehand', 'backhand', 'footwork'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 72,
                duration: 12,
                focusArea: 'Footwork',
                courtArea: 'baseline',
                tags: ['footwork', 'endurance', 'defense'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '8',
                title: 'Return Practice',
                description: 'Practice returning serves from various positions',
                category: 'drill',
                drillType: 'baskets',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: true,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '12+',
                focusAreas: ['backhand', 'forehand'],
                playMode: 'both',
                rating: 4,
                timesUsed: 56,
                duration: 15,
                focusArea: 'Return',
                courtArea: 'baseline',
                tags: ['return', 'serve-receive'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '9',
                title: 'Tiebreaker Simulation',
                description: 'Play a tiebreaker with match-like pressure',
                category: 'game',
                drillType: 'points',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'teens',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['serve', 'consistency'],
                playMode: 'singles',
                rating: 4,
                timesUsed: 41,
                duration: 15,
                focusArea: 'Mental',
                courtArea: 'full-court',
                tags: ['competitive', 'tiebreaker', 'pressure'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '10',
                title: 'Doubles Poaching Drill',
                description: 'Practice poaching volleys at the net in doubles formation',
                category: 'drill',
                drillType: 'points',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 4,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['volley'],
                playMode: 'doubles',
                rating: 4,
                timesUsed: 29,
                duration: 12,
                focusArea: 'Doubles',
                courtArea: 'full-court',
                tags: ['doubles', 'volley', 'poaching'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '11',
                title: 'Forehand Inside-Out',
                description: 'Run around backhand to hit inside-out forehands',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'hard',
                level: 'advanced',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['forehand', 'footwork'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 48,
                duration: 10,
                focusArea: 'Forehand',
                courtArea: 'baseline',
                tags: ['forehand', 'footwork', 'patterns'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '12',
                title: 'American Doubles',
                description: 'Two players on one side vs one player on the other, rotating',
                category: 'game',
                drillType: 'games',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'kids',
                needsCoach: true,
                playerCount: 3,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['consistency', 'footwork'],
                playMode: 'doubles',
                rating: 4,
                timesUsed: 65,
                duration: 20,
                focusArea: 'Fun',
                courtArea: 'full-court',
                tags: ['fun', '3-players', 'rotation'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '13',
                title: 'Serve Targets',
                description: 'Hit serves to specific targets in the service box',
                category: 'basket',
                drillType: 'baskets',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'teens',
                needsCoach: true,
                playerCount: 1,
                courtsNeeded: 1,
                ballsNeeded: '12+',
                focusAreas: ['serve'],
                playMode: 'both',
                rating: 3,
                timesUsed: 89,
                duration: 10,
                focusArea: 'Serve',
                courtArea: 'service-line',
                tags: ['serve', 'accuracy', 'solo'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '14',
                title: 'King of the Court',
                description: 'Competitive rotation game where winner stays on',
                category: 'game',
                drillType: 'games',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'teens',
                needsCoach: true,
                playerCount: 6,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['consistency'],
                playMode: 'both',
                rating: 5,
                timesUsed: 93,
                duration: 25,
                focusArea: 'Competition',
                courtArea: 'full-court',
                tags: ['competitive', 'rotation', 'group'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '15',
                title: 'Passing Shot Practice',
                description: 'Practice passing shots against a net player',
                category: 'drill',
                drillType: 'points',
                difficulty: 'hard',
                level: 'pro',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['forehand', 'backhand'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 37,
                duration: 12,
                focusArea: 'Passing',
                courtArea: 'baseline',
                tags: ['passing', 'defense'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '16',
                title: 'Mini Tennis',
                description: 'Play inside the service boxes with smaller court',
                category: 'game',
                drillType: 'games',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'kids',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['consistency', 'volley'],
                playMode: 'both',
                rating: 4,
                timesUsed: 78,
                duration: 10,
                focusArea: 'Touch',
                courtArea: 'service-box',
                tags: ['kids', 'mini-tennis', 'touch'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '17',
                title: 'Two-on-One Baseline',
                description: 'Two players at the baseline vs one player, working on consistency',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'teens',
                needsCoach: true,
                playerCount: 3,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['consistency', 'footwork'],
                playMode: 'both',
                rating: 4,
                timesUsed: 44,
                duration: 15,
                focusArea: 'Endurance',
                courtArea: 'baseline',
                tags: ['endurance', '3-players', 'rally'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '18',
                title: 'Overhead Smash Practice',
                description: 'Practice overhead smashes from various positions',
                category: 'basket',
                drillType: 'baskets',
                difficulty: 'medium',
                level: 'intermediate',
                ageGroup: 'adults',
                needsCoach: true,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '12+',
                focusAreas: ['volley'],
                playMode: 'both',
                rating: 3,
                timesUsed: 32,
                duration: 10,
                focusArea: 'Overhead',
                courtArea: 'full-court',
                tags: ['overhead', 'smash', 'basket'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '19',
                title: 'Consistency Challenge',
                description: 'See how many balls you can rally without missing',
                category: 'drill',
                drillType: 'rallies',
                difficulty: 'easy',
                level: 'beginner',
                ageGroup: 'kids',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '0-4',
                focusAreas: ['consistency'],
                playMode: 'both',
                rating: 3,
                timesUsed: 67,
                duration: 10,
                focusArea: 'Consistency',
                courtArea: 'baseline',
                tags: ['consistency', 'rally', 'challenge'],
                isPublic: true,
                createdAt: new Date(),
            },
            {
                id: '20',
                title: 'Serve and Volley Combo',
                description: 'Serve and immediately come to net for a volley finish',
                category: 'drill',
                drillType: 'points',
                difficulty: 'hard',
                level: 'pro',
                ageGroup: 'adults',
                needsCoach: false,
                playerCount: 2,
                courtsNeeded: 1,
                ballsNeeded: '4-12',
                focusAreas: ['serve', 'volley', 'footwork'],
                playMode: 'singles',
                rating: 5,
                timesUsed: 25,
                duration: 15,
                focusArea: 'Net Play',
                courtArea: 'full-court',
                tags: ['serve-volley', 'transition', 'advanced'],
                isPublic: true,
                createdAt: new Date(),
            },
        ];

        // Sample groups
        this.groups = [
            { id: '1', name: 'College Tennis Coaches', category: 'college', memberCount: 156, description: 'Network for college tennis coaches' },
            { id: '2', name: 'Junior Development', category: 'juniors', memberCount: 243, description: 'Coaches working with junior players' },
            { id: '3', name: 'Pro Player Development', category: 'pro', memberCount: 89, description: 'Coaches working with professional players' },
        ];

        // Sample opportunities
        this.opportunities = [
            { id: '2', type: 'looking-for-players', title: 'Recruits Needed', description: 'Academy seeking talented juniors', level: 'Junior', location: 'Florida', active: true, createdAt: new Date() },
        ];

        // Sample teams
        this.teams = [
            {
                id: 'team-1',
                name: 'Division 2 Men',
                type: 'university',
                courtCount: 3,
                members: [
                    { id: 'p1', name: 'Alex Johnson', role: 'player', level: '5.0' },
                    { id: 'p2', name: 'Marcus Chen', role: 'player', level: '4.5' },
                    { id: 'p3', name: 'David Smith', role: 'player', level: '4.5' },
                    { id: 'p4', name: 'Sam Wilson', role: 'player', level: '5.0' },
                    { id: 'p5', name: 'Chris Lee', role: 'player', level: '4.0' },
                    { id: 'p6', name: 'Tom Brown', role: 'player', level: '4.5' },
                    { id: 'c1', name: 'Coach Mike', role: 'assistant-coach' },
                ]
            },
            {
                id: 'team-2',
                name: 'Junior Elite',
                type: 'academy',
                courtCount: 4,
                members: [
                    { id: 'j1', name: 'Sarah Connor', role: 'player', level: 'Junior' },
                    { id: 'j2', name: 'John Doe', role: 'player', level: 'Junior' },
                    { id: 'j3', name: 'Jane Doe', role: 'player', level: 'Junior' },
                    { id: 'j4', name: 'Mike Ross', role: 'player', level: 'Junior' },
                ]
            }
        ];
    }

    // Exercise methods
    getExercises() {
        return this.exercises;
    }

    getExercise(id: string) {
        return this.exercises.find(e => e.id === id);
    }

    addExercise(exercise: Exercise) {
        this.exercises.push(exercise);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsAddExercise(this.currentUserId, exercise).catch(console.error);
    }

    updateExercise(id: string, updates: Partial<Exercise>) {
        const index = this.exercises.findIndex(e => e.id === id);
        if (index !== -1) {
            this.exercises[index] = { ...this.exercises[index], ...updates };
            this.saveToLocalStorage();
            this.notify();
            if (this.currentUserId) fsUpdateExercise(this.currentUserId, id, updates).catch(console.error);
        }
    }

    deleteExercise(id: string) {
        this.exercises = this.exercises.filter(e => e.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsDeleteExercise(this.currentUserId, id).catch(console.error);
    }

    // Session methods
    getSessions() {
        return this.sessions;
    }

    getSession(id: string) {
        return this.sessions.find(s => s.id === id);
    }

    addSession(session: Session) {
        this.sessions.push(session);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) {
            fsAddSession(this.currentUserId, session).catch(error => {
                console.error("Firestore addSession failed, rolling back:", error);
                this.sessions = this.sessions.filter(s => s.id !== session.id);
                this.saveToLocalStorage();
                this.notify();
            });
        }
    }

    async updateSession(id: string, updates: Partial<Session>) {
        const index = this.sessions.findIndex(s => s.id === id);
        if (index !== -1) {
            const previousState = { ...this.sessions[index] };
            this.sessions[index] = { ...previousState, ...updates };
            this.saveToLocalStorage();
            this.notify();
            if (this.currentUserId) {
                try {
                    await fsUpdateSession(this.currentUserId, id, updates);
                } catch (error) {
                    console.error("Firestore updateSession failed, rolling back:", error);
                    const rollbackIndex = this.sessions.findIndex(s => s.id === id);
                    if (rollbackIndex !== -1) {
                        this.sessions[rollbackIndex] = previousState;
                        this.saveToLocalStorage();
                        this.notify();
                    }
                    throw error;
                }
            }
        }
    }



    deleteSession(id: string) {
        const sessionToDelete = this.sessions.find(s => s.id === id);
        if (!sessionToDelete) return;

        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) {
            fsDeleteSession(this.currentUserId, id).catch(error => {
                console.error("Firestore deleteSession failed, rolling back:", error);
                this.sessions.push(sessionToDelete);
                this.saveToLocalStorage();
                this.notify();
            });
        }
    }

    // Calendar methods
    getCalendarEvents() {
        return this.calendar;
    }

    getCalendarSources(): CalendarSource[] {
        const sources: CalendarSource[] = [];

        // 1. The Coach (User)
        sources.push({
            id: 'user', // Used in legacy records, or could use currentUserId
            name: this.userProfile?.name || 'My Calendar',
            type: 'person',
            color: 'bg-green-500',
            initials: this.userProfile?.name?.substring(0, 2).toUpperCase() || 'ME'
        });

        // Consistent Color Helper
        const getColor = (id: string, isTeam: boolean) => {
            if (isTeam) return 'bg-purple-500';
            const colors = ['bg-blue-500', 'bg-pink-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500'];
            let hash = 0;
            for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        };

        // 2. Teams
        this.teams.forEach(team => {
            sources.push({
                id: team.id,
                name: team.name,
                type: 'team',
                color: getColor(team.id, true),
                initials: team.name.substring(0, 2).toUpperCase()
            });
        });

        // 3. Players (Unique members across all teams)
        const playerMap = new Map<string, CalendarSource>();
        this.teams.forEach(team => {
            team.members.forEach(member => {
                if (member.role === 'player' && !playerMap.has(member.id)) {
                    playerMap.set(member.id, {
                        id: member.id,
                        name: member.name,
                        type: 'person',
                        color: getColor(member.id, false),
                        initials: member.name.substring(0, 2).toUpperCase()
                    });
                }
            });
        });

        sources.push(...Array.from(playerMap.values()));
        return sources;
    }

    addCalendarEvent(event: CalendarEvent) {
        this.calendar.push(event);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) {
            fsAddCalendarEvent(this.currentUserId, event).catch(error => {
                console.error("Firestore addCalendarEvent failed, rolling back:", error);
                this.calendar = this.calendar.filter(e => e.id !== event.id);
                this.saveToLocalStorage();
                this.notify();
            });
        }
    }

    async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>) {
        const index = this.calendar.findIndex(e => e.id === id);
        if (index !== -1) {
            const previousState = { ...this.calendar[index] };
            this.calendar[index] = { ...previousState, ...updates };
            this.saveToLocalStorage();
            this.notify();
            if (this.currentUserId) {
                try {
                    await fsUpdateCalendarEvent(this.currentUserId, id, updates);
                } catch (error) {
                    console.error("Firestore updateCalendarEvent failed, rolling back:", error);
                    const rollbackIndex = this.calendar.findIndex(e => e.id === id);
                    if (rollbackIndex !== -1) {
                        this.calendar[rollbackIndex] = previousState;
                        this.saveToLocalStorage();
                        this.notify();
                    }
                    throw error;
                }
            }
        }
    }

    deleteCalendarEvent(id: string) {
        const eventToDelete = this.calendar.find(e => e.id === id);
        if (!eventToDelete) return;

        this.calendar = this.calendar.filter(e => e.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) {
            fsDeleteCalendarEvent(this.currentUserId, id).catch(error => {
                console.error("Firestore deleteCalendarEvent failed, rolling back:", error);
                this.calendar.push(eventToDelete);
                this.saveToLocalStorage();
                this.notify();
            });
        }
    }

    deleteCalendarEventsByGroup(groupId: string) {
        const eventsToDelete = this.calendar.filter(e => e.recurrenceGroupId === groupId);
        if (eventsToDelete.length === 0) return;

        this.calendar = this.calendar.filter(e => e.recurrenceGroupId !== groupId);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) {
            fsDeleteCalendarEventsByGroup(this.currentUserId, groupId).catch(error => {
                console.error("Firestore deleteCalendarEventsByGroup failed, rolling back:", error);
                this.calendar = [...this.calendar, ...eventsToDelete];
                this.saveToLocalStorage();
                this.notify();
            });
        }
    }

    // Playlist methods
    getPlaylists() {
        return this.playlists;
    }

    addPlaylist(playlist: Playlist) {
        this.playlists.push(playlist);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsAddPlaylist(this.currentUserId, playlist).catch(console.error);
    }

    deletePlaylist(id: string) {
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsDeletePlaylist(this.currentUserId, id).catch(console.error);
    }

    // Team methods
    getTeams() {
        return this.teams;
    }

    getTeam(id: string) {
        return this.teams.find(t => t.id === id);
    }

    addTeam(team: Team) {
        this.teams.push(team);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsAddTeam(this.currentUserId, team).catch(console.error);
    }

    updateTeam(id: string, updates: Partial<Team>) {
        const index = this.teams.findIndex(t => t.id === id);
        if (index !== -1) {
            this.teams[index] = { ...this.teams[index], ...updates };
            this.saveToLocalStorage();
            this.notify();
            if (this.currentUserId) fsUpdateTeam(this.currentUserId, id, updates).catch(console.error);
        }
    }

    deleteTeam(id: string) {
        this.teams = this.teams.filter(t => t.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsDeleteTeam(this.currentUserId, id).catch(console.error);
    }

    // Message methods
    getMessages() {
        return this.messages;
    }

    addMessage(message: Message) {
        this.messages.push(message);
        this.notify();
    }

    markMessageAsRead(id: string) {
        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.read = true;
            this.notify();
        }
    }

    // Group methods
    getGroups() {
        return this.groups;
    }

    // Opportunity methods
    getOpportunities() {
        return this.opportunities;
    }

    // Program methods
    getPrograms() {
        return this.programs;
    }

    getProgram(id: string) {
        return this.programs.find(p => p.id === id);
    }

    addProgram(program: TrainingProgram) {
        this.programs.push(program);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsAddProgram(this.currentUserId, program).catch(console.error);
    }

    updateProgram(id: string, updates: Partial<TrainingProgram>) {
        const index = this.programs.findIndex(p => p.id === id);
        if (index !== -1) {
            this.programs[index] = { ...this.programs[index], ...updates };
            this.saveToLocalStorage();
            this.notify();
            if (this.currentUserId) fsUpdateProgram(this.currentUserId, id, updates).catch(console.error);
        }
    }

    deleteProgram(id: string) {
        this.programs = this.programs.filter(p => p.id !== id);
        this.saveToLocalStorage();
        this.notify();
        if (this.currentUserId) fsDeleteProgram(this.currentUserId, id).catch(console.error);
    }

    // Notification methods
    getNotifications(userId: string) {
        return this.notifications
            .filter(n => n.userId === userId || n.userId === 'all')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    getUnreadNotificationCount(userId: string) {
        return this.getNotifications(userId).filter(n => !n.read).length;
    }

    addNotification(notification: Notification) {
        this.notifications.push(notification);
        this.saveToLocalStorage();
        this.notify();
    }

    markNotificationRead(id: string) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications[index].read = true;
            this.saveToLocalStorage();
            this.notify();
        }
    }

    markAllNotificationsRead(userId: string) {
        this.notifications = this.notifications.map(n => {
            if (n.userId === userId || n.userId === 'all') {
                return { ...n, read: true };
            }
            return n;
        });
        this.saveToLocalStorage();
    }

    clearNotification(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveToLocalStorage();
    }

    // Notebook methods
    getNotebookNoteSingle(targetId: string, type: 'mental' | 'technical' | 'tactical', subType: string = ''): NotebookNote | undefined {
        return this.notebookNotes.find(n => 
            n.targetId === targetId && 
            n.type === type && 
            n.subType === subType
        );
    }

    saveNotebookNoteSingle(targetId: string, type: 'mental' | 'technical' | 'tactical', subType: string = '', content: string) {
        const index = this.notebookNotes.findIndex(n => 
            n.targetId === targetId && 
            n.type === type && 
            n.subType === subType
        );

        const timestamp = new Date();
        let selectedNote: NotebookNote;

        if (index !== -1) {
            this.notebookNotes[index] = {
                ...this.notebookNotes[index],
                content: content,
                updatedAt: timestamp
            };
            selectedNote = this.notebookNotes[index];
        } else {
            selectedNote = {
                id: Math.random().toString(36).substring(7),
                userId: this.currentUserId || 'guest',
                targetId: targetId,
                type: type,
                subType: subType,
                content: content,
                createdAt: timestamp,
                updatedAt: timestamp
            };
            this.notebookNotes.push(selectedNote);
        }
        this.saveToLocalStorage();
        if (this.currentUserId) fsSetNotebookNote(this.currentUserId, selectedNote).catch(console.error);
    }

    async submitPlayerFeedback(coachId: string, sessionId: string, feedback: PlayerFeedback) {
        // Find the session in local store
        const index = this.sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
            this.sessions[index] = { ...this.sessions[index], playerFeedback: feedback };
            this.saveToLocalStorage();
            this.notify();
        }

        // Update coach's path
        await fsUpdateSession(coachId, sessionId, { playerFeedback: feedback });
        
        // Also add a notification for the coach
        const notification: Notification = {
            id: Math.random().toString(36).substring(7),
            userId: coachId,
            type: 'feedback_added',
            title: 'New Feedback',
            message: `${this.userProfile?.name || 'A player'} submitted feedback for a session.`,
            read: false,
            createdAt: new Date(),
            actionUrl: `/sessions/${sessionId}`
        };
        await fsAddNotification(coachId, notification);
    }

    async markNotificationRead(id: string) {
        if (!this.currentUserId) return;
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications[index].read = true;
            this.saveToLocalStorage();
            this.notify();
        }
        await fsUpdateNotificationRead(this.currentUserId, id, true);
    }

    async markAllNotificationsRead(userId: string) {
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
        this.saveToLocalStorage();
        this.notify();
        // In a real app we'd batch update Firestore here
    }

    async clearNotification(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveToLocalStorage();
        this.notify();
        // In a real app we'd delete from Firestore here
    }
}

// Export singleton instance
export const dataStore = new DataStore();
