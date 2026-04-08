/**
 * firestoreService.ts
 * ───────────────────
 * Async Firestore backend that mirrors every dataStore method.
 * All user data lives under:  /users/{uid}/{collection}
 *
 * Call firestoreService.init(uid) once per login, then use
 * the individual helpers throughout the app.
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    Timestamp,
    onSnapshot,
    Unsubscribe,
    query,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import type {
    Exercise,
    Session,
    CalendarEvent,
    Playlist,
    Team,
    TrainingProgram,
    CalendarSource,
    UserProfile,
    NotebookNote,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function userCol(uid: string, col: string) {
    return collection(db, 'users', uid, col);
}

function userDoc(uid: string, col: string, id: string) {
    return doc(db, 'users', uid, col, id);
}

/** Convert Firestore Timestamps → JS Date recursively on a plain object */
function hydrate<T>(raw: any): T {
    if (!raw || typeof raw !== 'object') return raw;
    const out: any = Array.isArray(raw) ? [] : {};
    for (const key of Object.keys(raw)) {
        const v = raw[key];
        if (v instanceof Timestamp) {
            out[key] = v.toDate();
        } else if (Array.isArray(v)) {
            out[key] = v.map(hydrate);
        } else if (v && typeof v === 'object' && !(v instanceof Date)) {
            out[key] = hydrate(v);
        } else {
            out[key] = v;
        }
    }
    return out as T;
}

// ─── UserProfile ─────────────────────────────────────────────────────────────

export async function fsGetProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(userDoc(uid, 'profile', 'data'));
    let profile = snap.exists() ? hydrate<UserProfile>(snap.data()) : null;

    // Emergency Repair: Fallback to the root users/{uid} collection where the auth role is guaranteed
    try {
        const rootSnap = await getDoc(doc(db, 'users', uid));
        if (rootSnap.exists()) {
            const rootData = rootSnap.data();
            if (rootData?.role === 'player') {
                if (profile) {
                    profile.role = 'player';
                } else {
                    profile = hydrate<UserProfile>({
                        id: uid,
                        role: 'player',
                        name: rootData.displayName || 'Player',
                        email: rootData.email || '',
                        createdAt: rootData.createdAt || new Date(),
                    });
                }
            } else if (rootData?.role === 'coach' && profile) {
                profile.role = 'coach';
            }
        }
    } catch (err) {
        console.error("Failed to repair profile role from root doc", err);
    }

    return profile;
}

export async function fsSetProfile(uid: string, profile: UserProfile): Promise<void> {
    await setDoc(userDoc(uid, 'profile', 'data'), profile);
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export function fsListenExercises(uid: string, onUpdate: (data: Exercise[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'exercises'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Exercise>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddExercise(uid: string, exercise: Exercise): Promise<void> {
    await setDoc(userDoc(uid, 'exercises', exercise.id), exercise);
}

export async function fsUpdateExercise(uid: string, id: string, updates: Partial<Exercise>): Promise<void> {
    await updateDoc(userDoc(uid, 'exercises', id), updates as any);
}

export async function fsDeleteExercise(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'exercises', id));
}

/** Bulk-write all exercises (used for seeding initial data) */
export async function fsBatchWriteExercises(uid: string, exercises: Exercise[]): Promise<void> {
    const batch = writeBatch(db);
    for (const ex of exercises) {
        batch.set(userDoc(uid, 'exercises', ex.id), ex);
    }
    await batch.commit();
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function fsListenSessions(uid: string, onUpdate: (data: Session[]) => void): Unsubscribe {
    const q = query(userCol(uid, 'sessions'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Session>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddSession(uid: string, session: Session): Promise<void> {
    await setDoc(userDoc(uid, 'sessions', session.id), session);
}

export async function fsUpdateSession(uid: string, id: string, updates: Partial<Session>): Promise<void> {
    await updateDoc(userDoc(uid, 'sessions', id), updates as any);
}

export async function fsDeleteSession(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'sessions', id));
}

// ─── Calendar Events ─────────────────────────────────────────────────────────

export function fsListenCalendarEvents(uid: string, onUpdate: (data: CalendarEvent[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'calendar'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<CalendarEvent>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddCalendarEvent(uid: string, event: CalendarEvent): Promise<void> {
    await setDoc(userDoc(uid, 'calendar', event.id), event);
}

export async function fsUpdateCalendarEvent(uid: string, id: string, updates: Partial<CalendarEvent>): Promise<void> {
    await updateDoc(userDoc(uid, 'calendar', id), updates as any);
}

export async function fsDeleteCalendarEvent(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'calendar', id));
}

export async function fsDeleteCalendarEventsByGroup(uid: string, groupId: string): Promise<void> {
    const snap = await getDocs(userCol(uid, 'calendar'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
        if (d.data().recurrenceGroupId === groupId) batch.delete(d.ref);
    });
    await batch.commit();
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export function fsListenPlaylists(uid: string, onUpdate: (data: Playlist[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'playlists'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Playlist>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddPlaylist(uid: string, playlist: Playlist): Promise<void> {
    await setDoc(userDoc(uid, 'playlists', playlist.id), playlist);
}

export async function fsDeletePlaylist(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'playlists', id));
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function fsListenTeams(uid: string, onUpdate: (data: Team[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'teams'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Team>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddTeam(uid: string, team: Team): Promise<void> {
    await setDoc(userDoc(uid, 'teams', team.id), team);
}

export async function fsUpdateTeam(uid: string, id: string, updates: Partial<Team>): Promise<void> {
    await updateDoc(userDoc(uid, 'teams', id), updates as any);
}

export async function fsDeleteTeam(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'teams', id));
}

export async function fsBatchWriteTeams(uid: string, teams: Team[]): Promise<void> {
    const batch = writeBatch(db);
    for (const t of teams) {
        batch.set(userDoc(uid, 'teams', t.id), t);
    }
    await batch.commit();
}

// ─── Training Programs ────────────────────────────────────────────────────────

export function fsListenPrograms(uid: string, onUpdate: (data: TrainingProgram[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'programs'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<TrainingProgram>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddProgram(uid: string, program: TrainingProgram): Promise<void> {
    await setDoc(userDoc(uid, 'programs', program.id), program);
}

export async function fsUpdateProgram(uid: string, id: string, updates: Partial<TrainingProgram>): Promise<void> {
    await updateDoc(userDoc(uid, 'programs', id), updates as any);
}

export async function fsDeleteProgram(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'programs', id));
}

// ─── Calendar Sources ─────────────────────────────────────────────────────────

export function fsListenCalendarSources(uid: string, onUpdate: (data: CalendarSource[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'calendarSources'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<CalendarSource>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddCalendarSource(uid: string, source: CalendarSource): Promise<void> {
    await setDoc(userDoc(uid, 'calendarSources', source.id), source);
}

export async function fsBatchWriteCalendarSources(uid: string, sources: CalendarSource[]): Promise<void> {
    const batch = writeBatch(db);
    for (const s of sources) {
        batch.set(userDoc(uid, 'calendarSources', s.id), s);
    }
    await batch.commit();
}

// ─── Notebook Notes ────────────────────────────────────────────────────────

export function fsListenNotebookNotes(uid: string, onUpdate: (data: NotebookNote[]) => void): Unsubscribe {
    return onSnapshot(userCol(uid, 'notebookNotes'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<NotebookNote>({ id: d.id, ...d.data() })));
    });
}

export async function fsSetNotebookNote(uid: string, note: NotebookNote): Promise<void> {
    await setDoc(userDoc(uid, 'notebookNotes', note.id), note);
}

export async function fsDeleteNotebookNote(uid: string, id: string): Promise<void> {
    await deleteDoc(userDoc(uid, 'notebookNotes', id));
}

// ─── Notifications ─────────────────────────────────────────────────────────

export function fsListenNotifications(uid: string, onUpdate: (data: any[]) => void): Unsubscribe {
    const q = query(userCol(uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
        onUpdate(snap.docs.map(d => hydrate<any>({ id: d.id, ...d.data() })));
    });
}

export async function fsAddNotification(uid: string, notification: any): Promise<void> {
    await setDoc(userDoc(uid, 'notifications', notification.id), notification);
}

export async function fsUpdateNotificationRead(uid: string, id: string, read: boolean): Promise<void> {
    await updateDoc(userDoc(uid, 'notifications', id), { read });
}

// ─── Player ↔ Coach Cross-Read Functions ─────────────────────────────────────
// These allow a player to listen to their connected coach's data.

/**
 * Listen to a COACH's calendar events (read by a connected player).
 * Optionally filter by the player's linked CalendarSource ID.
 */
export function fsListenCoachCalendarEvents(
    coachUid: string,
    onUpdate: (data: CalendarEvent[]) => void,
    linkedPlayerId?: string
): Unsubscribe {
    return onSnapshot(userCol(coachUid, 'calendar'), (snap) => {
        let events = snap.docs.map(d => hydrate<CalendarEvent>({ id: d.id, ...d.data() }));
        // If player has a linked ID, show events assigned to them + team events + general events
        if (linkedPlayerId) {
            events = events.filter(e =>
                e.sourceId === linkedPlayerId ||  // directly assigned to this player
                e.type === 'team-session' ||       // team sessions (visible to all)
                !e.sourceId                        // general/unassigned events
            );
        }
        onUpdate(events);
    });
}

/**
 * Listen to a COACH's sessions (read by a connected player).
 */
export function fsListenCoachSessions(
    coachUid: string,
    onUpdate: (data: Session[]) => void
): Unsubscribe {
    const q = query(userCol(coachUid, 'sessions'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Session>({ id: d.id, ...d.data() })));
    });
}

/**
 * Listen to a COACH's exercises (read by a connected player for drill details).
 */
export function fsListenCoachExercises(
    coachUid: string,
    onUpdate: (data: Exercise[]) => void
): Unsubscribe {
    return onSnapshot(userCol(coachUid, 'exercises'), (snap) => {
        onUpdate(snap.docs.map(d => hydrate<Exercise>({ id: d.id, ...d.data() })));
    });
}

/**
 * Listen to notebook notes a COACH wrote about this specific player.
 */
export function fsListenCoachNotesForPlayer(
    coachUid: string,
    linkedPlayerId: string,
    onUpdate: (data: NotebookNote[]) => void
): Unsubscribe {
    return onSnapshot(userCol(coachUid, 'notebookNotes'), (snap) => {
        const all = snap.docs.map(d => hydrate<NotebookNote>({ id: d.id, ...d.data() }));
        // Filter notes that target this player specifically
        const playerNotes = all.filter(n => n.targetId === linkedPlayerId);
        onUpdate(playerNotes);
    });
}

/**
 * When a player signs up via invite link, link their Firebase UID
 * back to the coach's CalendarSource entry so the coach can see them as "connected".
 */
export async function fsLinkPlayerToCoach(
    coachUid: string,
    linkedPlayerId: string,
    playerFirebaseUid: string,
    playerEmail: string
): Promise<void> {
    try {
        // Update the coach's CalendarSource to include the player's Firebase UID
        const sourceRef = userDoc(coachUid, 'calendarSources', linkedPlayerId);
        const sourceSnap = await getDoc(sourceRef);

        if (sourceSnap.exists()) {
            await updateDoc(sourceRef, {
                firebaseUid: playerFirebaseUid,
                email: playerEmail,
                linked: true,
                linkedAt: new Date()
            });
        }
    } catch (error) {
        console.error('Failed to link player to coach CalendarSource:', error);
    }
}

/**
 * When a player updates their training preferences, update their connected coach's CalendarSource record.
 */
export async function fsUpdateCoachCalendarSource(
    coachUid: string,
    linkedPlayerId: string,
    updates: Partial<CalendarSource>
): Promise<void> {
    try {
        const sourceRef = userDoc(coachUid, 'calendarSources', linkedPlayerId);
        await updateDoc(sourceRef, updates as any);
    } catch (error) {
        console.error('Failed to update coach CalendarSource:', error);
    }
}
