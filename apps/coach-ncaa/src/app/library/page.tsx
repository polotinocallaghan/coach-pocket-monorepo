'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataStore, Exercise, Session } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { cn, generateId } from '@/lib/utils';
import { Search, Plus, Filter, ArrowLeft, Trash2, Edit, ChevronDown, Star, X, BookMarked, Users, LayoutTemplate } from 'lucide-react';
import DrillAnimationModal from '@/components/features/library/DrillAnimationModal';

export default function DrillLibraryPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'exercises' | 'templates'>('exercises');
    const exercises = useDataStore(() => dataStore.getExercises());
    
    // Reactive templates
    const rawSessions = useDataStore(() => dataStore.getSessions());
    const templates = [
        ...[
            { id: 'pre-1', title: 'College Practice - 10 Players', description: 'Advanced college practice tailored for 10 players.', type: 'team', isTemplate: true, exercises: [], createdAt: new Date() },
            { id: 'pre-2', title: 'College Practice - 8 Players', description: 'Advanced college practice tailored for 8 players.', type: 'team', isTemplate: true, exercises: [], createdAt: new Date() },
            { id: 'pre-3', title: 'Academy Development - 6 Players', description: 'Intermediate academy development for 6 players.', type: 'team', isTemplate: true, exercises: [], createdAt: new Date() },
            { id: 'pre-4', title: 'Intensive Form - 4 Players', description: 'Advanced intensive form for 4 players.', type: 'team', isTemplate: true, exercises: [], createdAt: new Date() }
        ] as Session[],
        ...rawSessions.filter((s: Session) => s.isTemplate)
    ];
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [animatingDrill, setAnimatingDrill] = useState<Exercise | null>(null);

    // Comprehensive filter state
    const [filters, setFilters] = useState({
        drillType: 'all' as string,
        level: 'all' as string,
        ageGroup: 'all' as string,
        needsCoach: 'all' as string,
        playerCount: [1, 10] as [number, number],
        ballsNeeded: 'all' as string,
        focusAreas: [] as string[],
        minRating: 0,
        sortBy: 'recent' as string,
        playMode: 'all' as string,
        templateType: 'all' as string,
    });

    const filteredExercises = exercises.filter((exercise: Exercise) => {
        // Text search
        if (searchTerm) {
            const matchesSearch = exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
        }

        // Dropdown filters
        if (filters.drillType !== 'all' && exercise.drillType !== filters.drillType) return false;
        if (filters.level !== 'all' && exercise.level !== filters.level) return false;
        if (filters.ageGroup !== 'all' && exercise.ageGroup !== filters.ageGroup) return false;

        // Boolean filter
        if (filters.needsCoach !== 'all') {
            const needsCoach = filters.needsCoach === 'yes';
            if (exercise.needsCoach !== needsCoach) return false;
        }

        // Range filters
        if (exercise.playerCount < filters.playerCount[0] || exercise.playerCount > filters.playerCount[1]) return false;

        // Multi-select filters
        if (filters.focusAreas.length > 0 && !filters.focusAreas.some(f => exercise.focusAreas.includes(f as any))) return false;
        if (filters.ballsNeeded !== 'all' && exercise.ballsNeeded !== filters.ballsNeeded) return false;

        // Play mode filter
        if (filters.playMode !== 'all') {
            if (exercise.playMode !== filters.playMode && exercise.playMode !== 'both') return false;
        }

        // Rating filter
        if (exercise.rating < filters.minRating) return false;

        return true;
    }).sort((a: Exercise, b: Exercise) => {
        if (filters.sortBy === 'most-used') return b.timesUsed - a.timesUsed;
        if (filters.sortBy === 'highest-rated') return b.rating - a.rating;
        if (filters.sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        return 0; // default: recent
    });

    const filteredTemplates = templates.filter((template: Session) => {
        // Text search
        if (searchTerm) {
            const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            if (!matchesSearch) return false;
        }

        // Type filter
        if (filters.templateType !== 'all') {
            const isTeam = template.type === 'team';
            if (filters.templateType === 'team' && !isTeam) return false;
            if (filters.templateType === 'individual' && isTeam) return false;
        }

        // Focus areas filter
        if (filters.focusAreas.length > 0) {
            const hasFocus = template.exercises.some(se => {
                const ex = dataStore.getExercise(se.exerciseId);
                return ex?.focusAreas?.some(f => filters.focusAreas.includes(f as any));
            });
            // Predefined templates don't have exercises right now, so if focus area matched we could either show or hide.
            // Let's assume predefined templates match all focus areas if they are team templates.
            if (!hasFocus && !template.id.startsWith('pre-')) return false;
        }

        return true;
    });

    const toggleFocusArea = (area: string) => {
        setFilters(prev => ({
            ...prev,
            focusAreas: prev.focusAreas.includes(area)
                ? prev.focusAreas.filter(f => f !== area)
                : [...prev.focusAreas, area]
        }));
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setFilters({
            drillType: 'all',
            level: 'all',
            ageGroup: 'all',
            needsCoach: 'all',
            playerCount: [1, 10],
            ballsNeeded: 'all',
            focusAreas: [],
            minRating: 0,
            sortBy: 'recent',
            playMode: 'all',
            templateType: 'all',
        });
    };

    const hasActiveFilters = searchTerm || filters.drillType !== 'all' || filters.level !== 'all' ||
        filters.ageGroup !== 'all' || filters.needsCoach !== 'all' || filters.ballsNeeded !== 'all' ||
        filters.focusAreas.length > 0 || filters.minRating > 0 || filters.sortBy !== 'recent' ||
        filters.playMode !== 'all' || filters.templateType !== 'all';

    const handleCreateExercise = (formData: Partial<Exercise>) => {
        const newExercise: Exercise = {
            id: generateId(),
            title: formData.title || 'New Exercise',
            description: formData.description || '',
            category: formData.category || 'drill',
            drillType: formData.drillType || 'rallies',
            difficulty: formData.difficulty || 'medium',
            level: formData.level || 'intermediate',
            ageGroup: formData.ageGroup || 'adults',
            needsCoach: formData.needsCoach || false,
            playerCount: formData.playerCount || 2,
            courtsNeeded: formData.courtsNeeded || 1,
            ballsNeeded: formData.ballsNeeded || '4-12',
            playMode: formData.playMode || 'both',
            focusAreas: formData.focusAreas || [],
            rating: formData.rating || 3,
            timesUsed: 0,
            duration: formData.duration,
            focusArea: formData.focusArea,
            courtArea: formData.courtArea,
            tags: formData.tags || [],
            isPublic: false,
            createdAt: new Date(),
        };
        dataStore.addExercise(newExercise);
        setShowCreateModal(false);
    };

    const handleDeleteExercise = (id: string) => {
        if (confirm('Are you sure you want to delete this exercise?')) {
            dataStore.deleteExercise(id);
        }
    };

    const PREDEFINED_IDS = ['pre-1', 'pre-2', 'pre-3', 'pre-4'];
    const appTemplates = filteredTemplates.filter(t => PREDEFINED_IDS.includes(t.id));
    const myTemplates = filteredTemplates.filter(t => !PREDEFINED_IDS.includes(t.id));

    const handleCreateTemplate = (data: { title: string; description: string; type: string }) => {
        const newTemplate: Session = {
            id: generateId(),
            title: data.title,
            description: data.description,
            type: data.type as Session['type'],
            isTemplate: true,
            exercises: [],
            createdAt: new Date(),
        };
        dataStore.addSession(newTemplate);
    };

    const handleDeleteTemplate = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            dataStore.deleteSession(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Library</h1>
                        <div className="flex gap-4 border-b border-slate-700 pb-1">
                            <button
                                onClick={() => setActiveTab('exercises')}
                                className={cn(
                                    "px-4 py-2 font-bold text-sm tracking-wide transition-colors border-b-2",
                                    activeTab === 'exercises' ? "text-green-400 border-green-400" : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600"
                                )}
                            >
                                Drills ({filteredExercises.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('templates')}
                                className={cn(
                                    "px-4 py-2 font-bold text-sm tracking-wide transition-colors border-b-2",
                                    activeTab === 'templates' ? "text-blue-400 border-blue-400" : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600"
                                )}
                            >
                                Templates ({filteredTemplates.length})
                            </button>
                        </div>
                    </div>
                </div>
                {activeTab === 'exercises' ? (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
                    >
                        <Plus className="w-4 h-4" />
                        New Exercise
                    </button>
                ) : (
                    <button
                        onClick={() => setShowCreateTemplateModal(true)}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                )}
            </div>

            {/* Main Filter Bar */}
            <div className="space-y-4">
                {/* Top Row - Search + Primary Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'exercises' ? "Search exercises..." : "Search templates..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500"
                        />
                    </div>

                    {activeTab === 'exercises' ? (
                        <>
                            {/* Drill Type */}
                            <select
                                value={filters.drillType}
                                onChange={(e) => setFilters({ ...filters, drillType: e.target.value })}
                                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="all">All Types</option>
                                <option value="baskets">Baskets</option>
                                <option value="rallies">Rallies</option>
                                <option value="points">Points</option>
                                <option value="games">Games</option>
                            </select>

                            {/* Play Mode */}
                            <select
                                value={filters.playMode}
                                onChange={(e) => setFilters({ ...filters, playMode: e.target.value })}
                                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="all">All Modes</option>
                                <option value="singles">Singles</option>
                                <option value="doubles">Doubles</option>
                            </select>

                            {/* Level */}
                            <select
                                value={filters.level}
                                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                                <option value="pro">Pro</option>
                            </select>

                            {/* Sort By */}
                            <select
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="recent">Recent</option>
                                <option value="most-used">Most Used</option>
                                <option value="highest-rated">Highest Rated</option>
                                <option value="alphabetical">A-Z</option>
                            </select>

                            {/* Advanced Filters Toggle */}
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 rounded-lg transition border",
                                    showAdvancedFilters
                                        ? "bg-green-500/20 border-green-500 text-green-400"
                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-green-500"
                                )}
                            >
                                <Filter className="w-4 h-4" />
                                Advanced
                                <ChevronDown className={cn("w-4 h-4 transition", showAdvancedFilters && "rotate-180")} />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Template Type */}
                            <select
                                value={filters.templateType}
                                onChange={(e) => setFilters({ ...filters, templateType: e.target.value })}
                                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">All Templates</option>
                                <option value="individual">Individual</option>
                                <option value="team">Team</option>
                            </select>
                        </>
                    )}
                </div>

                {/* Focus Areas - Always visible chips */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-slate-400 py-1.5">Focus:</span>
                    {['forehand', 'backhand', 'serve', 'volley', 'consistency', 'footwork'].map(area => (
                        <button
                            key={area}
                            onClick={() => toggleFocusArea(area)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition",
                                filters.focusAreas.includes(area)
                                    ? "bg-green-500 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}
                        >
                            {area}
                        </button>
                    ))}

                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium hover:bg-red-500/30 transition"
                        >
                            <X className="w-3 h-3" />
                            Clear All
                        </button>
                    )}
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && activeTab === 'exercises' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        {/* Age Group */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Age Group</label>
                            <select
                                value={filters.ageGroup}
                                onChange={(e) => setFilters({ ...filters, ageGroup: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                            >
                                <option value="all">All Ages</option>
                                <option value="kids">Kids</option>
                                <option value="teens">Teens</option>
                                <option value="adults">Adults</option>
                            </select>
                        </div>

                        {/* Needs Coach */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Needs Coach</label>
                            <select
                                value={filters.needsCoach}
                                onChange={(e) => setFilters({ ...filters, needsCoach: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                            >
                                <option value="all">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        {/* Balls Needed */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Balls Needed</label>
                            <select
                                value={filters.ballsNeeded}
                                onChange={(e) => setFilters({ ...filters, ballsNeeded: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                            >
                                <option value="all">Any Amount</option>
                                <option value="0-4">0-4 balls</option>
                                <option value="4-12">4-12 balls</option>
                                <option value="12+">12+ balls</option>
                            </select>
                        </div>

                        {/* Player Count Range */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Players: {filters.playerCount[0]}-{filters.playerCount[1]}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={filters.playerCount[0]}
                                    onChange={(e) => setFilters({ ...filters, playerCount: [parseInt(e.target.value) || 1, filters.playerCount[1]] })}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                />
                                <span className="text-slate-400 py-2">-</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={filters.playerCount[1]}
                                    onChange={(e) => setFilters({ ...filters, playerCount: [filters.playerCount[0], parseInt(e.target.value) || 10] })}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                                />
                            </div>
                        </div>

                        {/* Minimum Rating */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Rating</label>
                            <div className="flex gap-2">
                                {[0, 1, 2, 3, 4, 5].map(rating => (
                                    <button
                                        key={rating}
                                        onClick={() => setFilters({ ...filters, minRating: rating })}
                                        className={cn(
                                            "flex items-center gap-1 px-3 py-2 rounded-lg transition border text-sm",
                                            filters.minRating === rating
                                                ? "bg-green-500/20 border-green-500 text-green-400"
                                                : "bg-slate-700 border-slate-600 text-slate-400 hover:border-green-500"
                                        )}
                                    >
                                        <Star className="w-4 h-4" fill={rating > 0 ? "currentColor" : "none"} />
                                        {rating === 0 ? 'Any' : `${rating}+`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto px-6 pb-12">
                {activeTab === 'exercises' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExercises.map((exercise: Exercise, index: number) => (
                            <div
                                key={`${exercise.id}-${index}`}
                                className="group bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex flex-col gap-2">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-semibold w-fit",
                                            exercise.category === 'drill' && "bg-blue-500/20 text-blue-400",
                                            exercise.category === 'basket' && "bg-purple-500/20 text-purple-400",
                                            exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400",
                                            exercise.category === 'game' && "bg-green-500/20 text-green-400"
                                        )}>
                                            {exercise.category}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className="w-3 h-3 text-yellow-500"
                                                    fill={i < exercise.rating ? "currentColor" : "none"}
                                                />
                                            ))}
                                            <span className="text-xs text-slate-500 ml-1">({exercise.timesUsed} uses)</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingExercise(exercise)}
                                            className="p-1.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Edit className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteExercise(exercise.id)}
                                            className="p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setAnimatingDrill(exercise)}
                                    className="text-xl font-bold text-white mb-2 text-left w-full hover:text-green-400 underline underline-offset-4 decoration-transparent hover:decoration-green-400 transition-colors focus:outline-none"
                                    title="Click to view drill animation"
                                >
                                    {exercise.title}
                                </button>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-3">{exercise.description}</p>

                                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                    <span className="bg-slate-700/50 px-2 py-1 rounded capitalize">{exercise.level}</span>
                                    <span className="bg-slate-700/50 px-2 py-1 rounded capitalize">{exercise.ageGroup}</span>
                                    <span className="bg-slate-700/50 px-2 py-1 rounded">{exercise.playerCount} players</span>
                                    {exercise.duration && <span className="bg-slate-700/50 px-2 py-1 rounded">{exercise.duration} min</span>}
                                    {exercise.needsCoach && <span className="bg-slate-700/50 px-2 py-1 rounded">Coach</span>}
                                    <span className={cn(
                                        "px-2 py-1 rounded capitalize",
                                        exercise.playMode === 'singles' ? "bg-cyan-500/20 text-cyan-400" :
                                            exercise.playMode === 'doubles' ? "bg-amber-500/20 text-amber-400" :
                                                "bg-slate-700/50"
                                    )}>{exercise.playMode}</span>
                                </div>

                                {exercise.focusAreas.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {exercise.focusAreas.map((area: string) => (
                                            <span key={area} className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded capitalize">
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredExercises.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-slate-800/50 rounded-xl border border-slate-700">
                                <p className="text-slate-500 text-lg">No exercises found. Try adjusting your filters.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* App Templates */}
                        {appTemplates.length > 0 && (
                            <div>
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">App Templates</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {appTemplates.map((template, index) => (
                                        <div
                                            key={`${template.id}-${index}`}
                                            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/40 transition-all flex flex-col group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{template.title}</h3>
                                            <p className="text-sm text-slate-400 line-clamp-2 mb-3 flex-1">{template.description}</p>
                                            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                                                <span className="capitalize">{template.type}</span>
                                                <span>{template.exercises?.length || 0} exercises</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Templates */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <LayoutTemplate className="w-3.5 h-3.5" />
                                    My Templates
                                    {myTemplates.length > 0 && <span className="text-slate-600">({myTemplates.length})</span>}
                                </h2>
                            </div>
                            {myTemplates.length === 0 ? (
                                <button
                                    onClick={() => setShowCreateTemplateModal(true)}
                                    className="w-full py-10 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center gap-2 text-slate-500 hover:border-blue-500/50 hover:text-blue-400 transition-all group"
                                >
                                    <Plus className="w-8 h-8" />
                                    <span className="text-sm font-medium">Create your first template</span>
                                    <span className="text-xs text-slate-600 group-hover:text-slate-500">Reusable practice sessions you design</span>
                                </button>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {myTemplates.map((template, index) => (
                                        <div
                                            key={`${template.id}-${index}`}
                                            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/40 transition-all flex flex-col group relative"
                                        >
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="absolute top-3 right-3 p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                            <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                                                <BookMarked className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{template.title}</h3>
                                            <p className="text-sm text-slate-400 line-clamp-2 mb-3 flex-1">{template.description}</p>
                                            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                                                <span className="capitalize">{template.type}</span>
                                                <span>{template.exercises?.length || 0} exercises</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {
                (showCreateModal || editingExercise) && (
                    <CreateExerciseModal
                        exercise={editingExercise}
                        onClose={() => {
                            setShowCreateModal(false);
                            setEditingExercise(null);
                        }}
                        onSave={(data) => {
                            if (editingExercise) {
                                dataStore.updateExercise(editingExercise.id, data);
                                setEditingExercise(null);
                            } else {
                                handleCreateExercise(data);
                            }
                        }}
                    />
                )
            }

            {showCreateTemplateModal && (
                <CreateTemplateModal
                    onClose={() => setShowCreateTemplateModal(false)}
                    onSave={(data) => {
                        handleCreateTemplate(data);
                        setShowCreateTemplateModal(false);
                    }}
                />
            )}

            <DrillAnimationModal
                isOpen={!!animatingDrill}
                onClose={() => setAnimatingDrill(null)}
                drill={animatingDrill}
            />
        </div >
    );
}

function CreateExerciseModal({ exercise, onClose, onSave }: {
    exercise: Exercise | null;
    onClose: () => void;
    onSave: (data: Partial<Exercise>) => void;
}) {
    const [formData, setFormData] = useState<Partial<Exercise>>({
        title: exercise?.title || '',
        description: exercise?.description || '',
        category: exercise?.category || 'drill',
        drillType: exercise?.drillType || 'rallies',
        difficulty: exercise?.difficulty || 'medium',
        level: exercise?.level || 'intermediate',
        ageGroup: exercise?.ageGroup || 'adults',
        needsCoach: exercise?.needsCoach || false,
        playerCount: exercise?.playerCount || 2,
        courtsNeeded: exercise?.courtsNeeded || 1,
        ballsNeeded: exercise?.ballsNeeded || '4-12',
        focusAreas: exercise?.focusAreas || [],
        rating: exercise?.rating || 3,
        duration: exercise?.duration,
        focusArea: exercise?.focusArea || '',
        courtArea: exercise?.courtArea || '',
        playMode: exercise?.playMode || 'both',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">{exercise ? 'Edit Exercise' : 'Create New Exercise'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500 h-24"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="basket">Basket</option>
                                <option value="drill">Drill</option>
                                <option value="points">Points</option>
                                <option value="game">Game</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Drill Type</label>
                            <select
                                value={formData.drillType}
                                onChange={(e) => setFormData({ ...formData, drillType: e.target.value as any })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="baskets">Baskets</option>
                                <option value="rallies">Rallies</option>
                                <option value="points">Points</option>
                                <option value="games">Games</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Level</label>
                            <select
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                                <option value="pro">Pro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Age Group</label>
                            <select
                                value={formData.ageGroup}
                                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as any })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="kids">Kids</option>
                                <option value="teens">Teens</option>
                                <option value="adults">Adults</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Play Mode</label>
                            <select
                                value={formData.playMode}
                                onChange={(e) => setFormData({ ...formData, playMode: e.target.value as any })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            >
                                <option value="singles">Singles</option>
                                <option value="doubles">Doubles</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Players</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.playerCount}
                                onChange={(e) => setFormData({ ...formData, playerCount: parseInt(e.target.value) || 2 })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration (min)</label>
                            <input
                                type="number"
                                value={formData.duration || ''}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Courts</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.courtsNeeded}
                                onChange={(e) => setFormData({ ...formData, courtsNeeded: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                            {exercise ? 'Save Changes' : 'Create Exercise'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateTemplateModal({ onClose, onSave }: {
    onClose: () => void;
    onSave: (data: { title: string; description: string; type: string }) => void;
}) {
    const [formData, setFormData] = useState({ title: '', description: '', type: 'practice' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-blue-400" />
                        Create Template
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Serve & Return – Advanced"
                            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What is this template for?"
                            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 h-24 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="practice">Individual Practice</option>
                            <option value="match">Match</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm font-medium">
                            Cancel
                        </button>
                        <button type="submit"
                            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-bold">
                            Create Template
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
