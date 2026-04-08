// ─── Drill Recommendation Engine ──────────────────────────────────────────────
// Analyzes player match stats, coach notes, and video clip feedback
// to surface the most relevant drills from the library.
// 
// Two data streams:
// 1. Quantitative (Stats): Low first serve %, high unforced errors, etc.
// 2. Qualitative (Comments/Tags): Coach notes, video clip tags & notes
// ──────────────────────────────────────────────────────────────────────────────

import { Exercise, CalendarEvent, VideoClip } from '@coach-pocket/core';

// ─── Gap Detection ───────────────────────────────────────────────────────────

export interface PerformanceGap {
    area: string;           // e.g. "serve", "forehand", "footwork", "backhand"
    source: 'stats' | 'notes' | 'video';
    severity: 'low' | 'medium' | 'high';
    detail: string;         // human-readable explanation
    keywords: string[];     // keywords to match against drill library
}

export interface DrillRecommendation {
    exercise: Exercise;
    relevance: number;      // 0-100 score
    matchedGaps: string[];  // which gaps this drill addresses
    reason: string;         // human-readable reason
}

// Keywords that map to exercise focusAreas
const AREA_KEYWORDS: Record<string, string[]> = {
    forehand: ['forehand', 'fh', 'forehand side', 'derecha', 'drive', 'forehand winner', 'forehand error', 'cross-court', 'crosscourt', 'inside out', 'inside-out'],
    backhand: ['backhand', 'bh', 'backhand side', 'revés', 'reves', 'one-hand', 'two-hand', 'slice', 'backhand error', 'down the line'],
    serve: ['serve', 'service', 'first serve', 'second serve', 'double fault', 'ace', 'toss', 'kick serve', 'flat serve', 'slice serve', 'saque', 'fault'],
    volley: ['volley', 'net', 'approach', 'net play', 'transition', 'touch', 'drop shot', 'drop volley', 'overhead', 'smash'],
    consistency: ['consistency', 'rally', 'depth', 'placement', 'unforced error', 'patience', 'buildingpoints', 'point construction', 'passive', 'aggressive', 'baseline'],
    footwork: ['footwork', 'movement', 'speed', 'agility', 'split step', 'recovery', 'position', 'stance', 'balance', 'lateral', 'court coverage'],
};

// Additional tags that map to tactical / mental areas
const TACTICAL_KEYWORDS: Record<string, string[]> = {
    tactical: ['tactical', 'strategy', 'pattern', 'point play', 'game plan', 'decision', 'shot selection', 'reading', 'anticipation'],
    mental: ['mental', 'pressure', 'focus', 'concentration', 'confidence', 'composure', 'clutch', 'break point', 'tie-break', 'nervios', 'nerves'],
    return: ['return', 'return of serve', 'receiving', 'return game', 'second serve return'],
};

// ─── Core Analysis Functions ─────────────────────────────────────────────────

/**
 * Analyze match statistics to find quantitative performance gaps
 */
function analyzeMatchStats(matches: CalendarEvent[]): PerformanceGap[] {
    const gaps: PerformanceGap[] = [];

    // Aggregate stats across recent matches
    const recentMatches = matches
        .filter(m => m.type === 'match' && m.matchStats)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Last 10 matches

    if (recentMatches.length === 0) return gaps;

    let totalAces = 0, totalDoubleFaults = 0, totalWinners = 0, totalUE = 0;
    let totalFirstServe = 0, firstServeCount = 0;
    let matchesWithStats = 0;

    recentMatches.forEach(m => {
        const stats = m.matchStats;
        if (!stats) return;
        matchesWithStats++;

        if (stats.aces !== undefined) totalAces += stats.aces;
        if (stats.doubleFaults !== undefined) totalDoubleFaults += stats.doubleFaults;
        if (stats.winners !== undefined) totalWinners += stats.winners;
        if (stats.unforcedErrors !== undefined) totalUE += stats.unforcedErrors;
        if (stats.firstServePercent !== undefined) {
            totalFirstServe += stats.firstServePercent;
            firstServeCount++;
        }
    });

    if (matchesWithStats === 0) return gaps;

    const avgDoubleFaults = totalDoubleFaults / matchesWithStats;
    const avgUE = totalUE / matchesWithStats;
    const avgFirstServe = firstServeCount > 0 ? totalFirstServe / firstServeCount : -1;
    const avgWinners = totalWinners / matchesWithStats;
    const ueToWinnerRatio = avgWinners > 0 ? avgUE / avgWinners : avgUE;

    // 1. Low first serve percentage
    if (avgFirstServe >= 0 && avgFirstServe < 55) {
        gaps.push({
            area: 'serve',
            source: 'stats',
            severity: avgFirstServe < 45 ? 'high' : 'medium',
            detail: `Low 1st serve % (avg ${Math.round(avgFirstServe)}%). Target: 55%+`,
            keywords: ['serve', 'first serve', 'consistency', 'toss'],
        });
    }

    // 2. High double faults
    if (avgDoubleFaults > 3) {
        gaps.push({
            area: 'serve',
            source: 'stats',
            severity: avgDoubleFaults > 5 ? 'high' : 'medium',
            detail: `High double faults (avg ${avgDoubleFaults.toFixed(1)}/match)`,
            keywords: ['serve', 'second serve', 'double fault'],
        });
    }

    // 3. High unforced errors
    if (avgUE > 20) {
        gaps.push({
            area: 'consistency',
            source: 'stats',
            severity: avgUE > 30 ? 'high' : 'medium',
            detail: `High unforced errors (avg ${Math.round(avgUE)}/match)`,
            keywords: ['consistency', 'rally', 'placement', 'patience'],
        });
    }

    // 4. Poor UE/Winner ratio
    if (ueToWinnerRatio > 1.5) {
        gaps.push({
            area: 'consistency',
            source: 'stats',
            severity: ueToWinnerRatio > 2 ? 'high' : 'medium',
            detail: `UE/Winner ratio too high (${ueToWinnerRatio.toFixed(1)}:1). Need smarter shot selection`,
            keywords: ['consistency', 'point construction', 'shot selection', 'tactical'],
        });
    }

    // 5. Low winners count (too passive)
    if (avgWinners < 10 && matchesWithStats >= 2) {
        gaps.push({
            area: 'forehand',
            source: 'stats',
            severity: 'medium',
            detail: `Low winners per match (avg ${Math.round(avgWinners)}). Could be too passive`,
            keywords: ['aggressive', 'forehand', 'winner', 'attacking'],
        });
    }

    // 6. Loss patterns
    const losses = recentMatches.filter(m => m.result === 'loss');
    if (losses.length >= 3 && losses.length / recentMatches.length > 0.6) {
        gaps.push({
            area: 'consistency',
            source: 'stats',
            severity: 'medium',
            detail: `Losing streak pattern: ${losses.length} losses in last ${recentMatches.length} matches`,
            keywords: ['mental', 'pressure', 'match play', 'confidence'],
        });
    }

    return gaps;
}

/**
 * Analyze coach's courtside notes and general notes for qualitative gaps
 */
function analyzeCoachNotes(matches: CalendarEvent[]): PerformanceGap[] {
    const gaps: PerformanceGap[] = [];
    const keywordCounts: Record<string, number> = {};

    const recentMatches = matches
        .filter(m => m.type === 'match')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    // Gather all text from notes
    const allTexts: string[] = [];
    recentMatches.forEach(m => {
        if (m.notes) allTexts.push(m.notes.toLowerCase());
        if (m.matchNotes) {
            m.matchNotes.forEach(n => allTexts.push(n.text.toLowerCase()));
        }
    });

    if (allTexts.length === 0) return gaps;

    const fullText = allTexts.join(' ');

    // Scan for keywords in each area
    const allAreas = { ...AREA_KEYWORDS, ...TACTICAL_KEYWORDS };
    Object.entries(allAreas).forEach(([area, keywords]) => {
        let count = 0;
        keywords.forEach(kw => {
            const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = fullText.match(regex);
            if (matches) count += matches.length;
        });
        if (count > 0) {
            keywordCounts[area] = count;
        }
    });

    // Convert keyword counts to gaps (threshold: mentioned 2+ times)
    Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([area, count]) => {
            if (count >= 1) {
                const focusArea = area as keyof typeof AREA_KEYWORDS;
                const keywords = AREA_KEYWORDS[focusArea] || TACTICAL_KEYWORDS[focusArea as keyof typeof TACTICAL_KEYWORDS] || [area];
                gaps.push({
                    area,
                    source: 'notes',
                    severity: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
                    detail: `Mentioned ${count} times in coach notes across recent matches`,
                    keywords: [area, ...keywords.slice(0, 3)],
                });
            }
        });

    return gaps;
}

/**
 * Analyze video clips for patterns
 */
function analyzeVideoClips(matches: CalendarEvent[]): PerformanceGap[] {
    const gaps: PerformanceGap[] = [];
    const tagCounts: Record<string, number> = {};
    const improvementTags: Record<string, number> = {};

    const recentMatches = matches
        .filter(m => m.type === 'match' && m.videoClips && m.videoClips.length > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    recentMatches.forEach(m => {
        m.videoClips?.forEach(clip => {
            // Count tags
            clip.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                // Weight improvement/critical clips higher
                if (clip.severity === 'improvement' || clip.severity === 'critical') {
                    improvementTags[tag] = (improvementTags[tag] || 0) + (clip.severity === 'critical' ? 2 : 1);
                }
            });

            // Analyze coach notes in clips
            if (clip.coachNote && (clip.severity === 'improvement' || clip.severity === 'critical')) {
                const noteText = clip.coachNote.toLowerCase();
                Object.entries(AREA_KEYWORDS).forEach(([area, keywords]) => {
                    keywords.forEach(kw => {
                        if (noteText.includes(kw)) {
                            improvementTags[area] = (improvementTags[area] || 0) + 1;
                        }
                    });
                });
            }
        });

        // Also check learning chapter titles
        m.learningChapters?.forEach(ch => {
            const title = ch.title.toLowerCase();
            Object.entries(AREA_KEYWORDS).forEach(([area, keywords]) => {
                keywords.forEach(kw => {
                    if (title.includes(kw)) {
                        improvementTags[area] = (improvementTags[area] || 0) + 2; // chapters weigh more
                    }
                });
            });
        });
    });

    // Convert to gaps
    Object.entries(improvementTags)
        .sort((a, b) => b[1] - a[1])
        .forEach(([area, score]) => {
            if (score >= 1) {
                const focusArea = area as keyof typeof AREA_KEYWORDS;
                const keywords = AREA_KEYWORDS[focusArea] || [area];
                gaps.push({
                    area,
                    source: 'video',
                    severity: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low',
                    detail: `Flagged ${score} times in video clip feedback`,
                    keywords: [area, ...keywords.slice(0, 3)],
                });
            }
        });

    return gaps;
}

// ─── Main Recommendation Function ────────────────────────────────────────────

/**
 * Get all performance gaps for a player
 */
export function getPlayerGaps(playerEvents: CalendarEvent[]): PerformanceGap[] {
    const statsGaps = analyzeMatchStats(playerEvents);
    const notesGaps = analyzeCoachNotes(playerEvents);
    const videoGaps = analyzeVideoClips(playerEvents);

    // Merge and deduplicate by area, keeping highest severity
    const merged: Record<string, PerformanceGap> = {};

    [...statsGaps, ...notesGaps, ...videoGaps].forEach(gap => {
        const key = gap.area;
        const severityOrder = { low: 1, medium: 2, high: 3 };
        if (!merged[key] || severityOrder[gap.severity] > severityOrder[merged[key].severity]) {
            merged[key] = {
                ...gap,
                // Merge keywords
                keywords: [...new Set([...(merged[key]?.keywords || []), ...gap.keywords])],
                // Combine details across sources
                detail: merged[key]
                    ? `${merged[key].detail}; ${gap.detail}`
                    : gap.detail,
            };
        } else if (merged[key]) {
            // Still merge keywords and details even if severity is lower
            merged[key].keywords = [...new Set([...merged[key].keywords, ...gap.keywords])];
            merged[key].detail = `${merged[key].detail}; ${gap.detail}`;
        }
    });

    return Object.values(merged).sort((a, b) => {
        const severityOrder = { low: 1, medium: 2, high: 3 };
        return severityOrder[b.severity] - severityOrder[a.severity];
    });
}

/**
 * Get recommended drills for a player based on their performance gaps
 */
export function getRecommendedDrills(
    playerEvents: CalendarEvent[],
    allExercises: Exercise[],
    maxResults: number = 12
): { recommendations: DrillRecommendation[]; gaps: PerformanceGap[] } {
    const gaps = getPlayerGaps(playerEvents);

    if (gaps.length === 0 || allExercises.length === 0) {
        return { recommendations: [], gaps: [] };
    }

    // Score each exercise against the gaps
    const scored: DrillRecommendation[] = [];

    allExercises.forEach(exercise => {
        let totalScore = 0;
        const matchedGaps: string[] = [];
        const reasons: string[] = [];

        gaps.forEach(gap => {
            let gapScore = 0;
            const severityMultiplier = gap.severity === 'high' ? 3 : gap.severity === 'medium' ? 2 : 1;

            // 1. Direct focusAreas match (strongest signal)
            const focusArea = gap.area as Exercise['focusAreas'][number];
            if (exercise.focusAreas?.includes(focusArea)) {
                gapScore += 30 * severityMultiplier;
                matchedGaps.push(gap.area);
                reasons.push(`Directly targets ${gap.area}`);
            }

            // 2. Title/description keyword match
            const exerciseText = `${exercise.title} ${exercise.description} ${(exercise.tags || []).join(' ')}`.toLowerCase();
            gap.keywords.forEach(keyword => {
                if (exerciseText.includes(keyword.toLowerCase())) {
                    gapScore += 10 * severityMultiplier;
                    if (!matchedGaps.includes(gap.area)) {
                        matchedGaps.push(gap.area);
                        reasons.push(`Keywords match: ${gap.area}`);
                    }
                }
            });

            // 3. Tags match
            if (exercise.tags) {
                exercise.tags.forEach(tag => {
                    if (gap.keywords.includes(tag.toLowerCase())) {
                        gapScore += 15 * severityMultiplier;
                        if (!matchedGaps.includes(gap.area)) {
                            matchedGaps.push(gap.area);
                        }
                    }
                });
            }

            totalScore += gapScore;
        });

        if (totalScore > 0) {
            scored.push({
                exercise,
                relevance: Math.min(100, totalScore),
                matchedGaps: [...new Set(matchedGaps)],
                reason: [...new Set(reasons)].join('. '),
            });
        }
    });

    // Sort by relevance and return top results
    scored.sort((a, b) => b.relevance - a.relevance);

    return {
        recommendations: scored.slice(0, maxResults),
        gaps,
    };
}

/**
 * Get a short summary of the primary weaknesses
 */
export function getWeaknessSummary(gaps: PerformanceGap[]): string {
    if (gaps.length === 0) return 'No performance data available yet.';

    const topGaps = gaps.slice(0, 3);
    const areas = topGaps.map(g => g.area).join(', ');
    return `Key focus areas: ${areas}. Based on ${topGaps.map(g => g.source).filter((v, i, a) => a.indexOf(v) === i).join(' + ')} analysis.`;
}
