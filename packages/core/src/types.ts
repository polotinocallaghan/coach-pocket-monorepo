export interface Exercise {
    id: string;
    title: string;
    description: string;

    // Core categorization
    category: 'basket' | 'drill' | 'points' | 'game';
    drillType: 'baskets' | 'rallies' | 'points' | 'games';

    // Difficulty and skill level
    difficulty: 'easy' | 'medium' | 'hard';
    level: 'beginner' | 'intermediate' | 'advanced' | 'pro';

    // Age and coaching
    ageGroup: 'kids' | 'teens' | 'adults';
    needsCoach: boolean;

    // Resource requirements
    playerCount: number; // 1-10
    courtsNeeded: number;
    ballsNeeded: '0-4' | '4-12' | '12+';

    // Play mode
    playMode: 'singles' | 'doubles' | 'both';

    // Focus areas and skills
    focusAreas: ('forehand' | 'backhand' | 'serve' | 'volley' | 'consistency' | 'footwork')[];

    // Quality and usage metrics
    rating: number; // 1-5 stars
    timesUsed: number;

    // Optional metadata
    duration?: number;
    focusArea?: string; // Deprecated, use focusAreas
    courtArea?: string;
    tags?: string[];
    diagram?: any;
    videoUrl?: string;
    imageUrl?: string;
    isPublic: boolean;
    createdAt: Date;
}

export interface PlayerFeedback {
    enjoyment: number; // 1-5
    featureRatings: { [key: string]: number }; // e.g. { technique: 4, tactics: 5 }
    comment?: string;
    submittedAt: Date;
}

export interface Session {
    id: string;
    title: string;
    description?: string;
    type: 'practice' | 'match' | 'match-prep' | 'team';
    isTemplate: boolean;
    sourceId?: string;
    exercises: SessionExercise[];
    createdAt: Date;
    // Team Session specific
    teamId?: string;
    attendance?: {
        memberId: string;
        present: boolean;
    }[];
    completedExerciseIds?: string[];
    // Status and Review
    status?: 'draft' | 'active' | 'completed';
    rating?: number; // 1-5 (Coach rating)
    feedback?: string; // Analysis/Notes (Coach feedback)
    playerFeedback?: PlayerFeedback;
    completedAt?: Date;
}

export interface SessionExercise {
    id: string;
    exerciseId: string;
    block: 'warm-up' | 'technical' | 'situational' | 'competitive' | 'cool-down';
    order: number;
    duration?: number;
    notes?: string;
    videoUrl?: string;
    rating?: number;
    // Team Session specific
    courtId?: string;
    timeSlot?: string;
}

export interface CalendarSource {
    id: string;
    name: string;
    type: 'person' | 'team';
    color: string;
    initials?: string;
    imageUrl?: string;
    trainingPreferences?: TrainingPreferences;
}

export interface VideoClip {
    id: string;
    startTime: number;       // seconds
    endTime: number;         // seconds
    title: string;
    coachNote: string;       // "Be more patient here", "Look at your footwork"
    tags?: string[];         // e.g. ["footwork", "backhand", "tactical"]
    chapterId?: string;      // links to LearningChapter
    severity?: 'positive' | 'improvement' | 'critical';  // feedback type
    createdAt: string;       // ISO date
}

export interface LearningChapter {
    id: string;
    title: string;           // e.g. "Net Approach Timing", "Serve Consistency"
    description?: string;
    color: string;           // UI color for grouping
    clipIds: string[];       // ordered list of clip IDs
}

export interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    time?: string;
    type: 'session' | 'team-session' | 'match' | 'match-prep' | 'event' | 'block';
    sessionId?: string;
    court?: string;
    notes?: string;
    completed: boolean;
    sourceId?: string; // Links to CalendarSource
    // Recurrence
    recurrenceGroupId?: string;  // shared ID for all events in a recurrence series
    recurrenceDays?: number[];   // 0=Sun..6=Sat
    // Match-specific fields
    opponent?: string;
    score?: string;            // e.g. "6-4, 3-6, 7-5"
    result?: 'win' | 'loss' | 'draw';
    videoUrl?: string;         // uploaded match video URL
    matchNotes?: { timestamp: string; text: string }[];  // timestamped coach notes
    matchStats?: {
        aces?: number;
        doubleFaults?: number;
        winners?: number;
        unforcedErrors?: number;
        firstServePercent?: number;
        breakPointsWon?: string;   // e.g. "3/5"
        [key: string]: any;        // extensible
    };
    surface?: 'hard' | 'clay' | 'grass' | 'indoor';
    // Video Feedback
    videoClips?: VideoClip[];
    learningChapters?: LearningChapter[];
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    category?: string;
    exerciseIds: string[];
    createdAt: Date;
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    type: 'academy' | 'club' | 'university';
    courtCount: number;
    members: TeamMember[];
}

export interface TeamMember {
    id: string;
    name: string;
    role: 'player' | 'assistant-coach';
    level?: string;
}

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    content: string;
    read: boolean;
    createdAt: Date;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    category: string;
    memberCount: number;
}

export interface Opportunity {
    id: string;
    type: 'looking-for-players' | 'player-available' | 'coach-position' | 'training-opportunity';
    title: string;
    description: string;
    level?: string;
    location?: string;
    active: boolean;

    createdAt: Date;
}

export interface TrainingPreferenceFeature {
    value: number; // 1 to 5
    isPriority: boolean;
}

export interface TrainingPreferences {
    rallies: TrainingPreferenceFeature;
    points: TrainingPreferenceFeature;
    technique: TrainingPreferenceFeature;
    tactics: TrainingPreferenceFeature;
    baskets: TrainingPreferenceFeature;
    serves: TrainingPreferenceFeature;
}

export interface UserProfile {
    id: string;
    role: 'coach' | 'player';
    appContext?: 'standard' | 'ncaa';
    name: string;
    email: string;
    connectedCoachId?: string;
    linkedPlayerId?: string;
    trainingPreferences?: TrainingPreferences;
    createdAt: Date;
}

export interface NotebookNote {
    id: string;
    userId: string; // The Coach ID
    targetId: string; // 'general' OR 'player_uid' OR 'team_id'
    type: 'mental' | 'technical' | 'tactical';
    subType?: 'derecha' | 'reves' | 'saque' | 'cortado' | 'resto' | 'volea' | 'smash' | string; 
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Notification {
    id: string;
    userId: string; // 'all', or specific user ID
    type: 'session_reminder' | 'feedback_added' | 'invite' | 'system';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    actionUrl?: string;
}

// Program Builder types
export interface WeekDay {
    dayOfWeek: number; // 0=Sun..6=Sat
    sessionTemplateId?: string; // linked session template
    focus: string; // e.g. 'technical', 'tactical', 'match-play', 'physical', 'recovery'
    intensity: 'low' | 'medium' | 'high'; // progressive overload
    exerciseIds?: string[]; // manually selected exercises from drill library
    notes?: string;
}

export interface ProgramWeek {
    weekNumber: number;
    theme: string; // e.g. 'Fundamentals', 'Pattern Development', 'Point Construction', 'Match Simulation'
    objective: string;
    days: WeekDay[];
}

export interface TrainingProgram {
    id: string;
    title: string;
    description?: string;
    totalWeeks: number;
    daysPerWeek: number;
    trainingDays: number[]; // which days of the week (0=Sun..6=Sat)
    startDate: Date;
    level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    focusProgression: string[]; // ordered focus per week
    weeks: ProgramWeek[];
    assignedTo?: string; // player or team name
    isBlueprint: boolean; // saveable as reusable blueprint
    createdAt: Date;
    status: 'draft' | 'active' | 'completed';
}
