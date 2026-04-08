'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Language = 'en' | 'es';

// ─── Translation Dictionary ─────────────────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
    en: {
        // ── Navigation & Global ──
        'nav.home': 'Home',
        'nav.calendar': 'Calendar',
        'nav.library': 'Library',
        'nav.sessions': 'My Sessions',
        'nav.team': 'Team',
        'nav.network': 'Network',
        'nav.newSession': '+ New Session',
        'nav.settings': 'Settings',

        // ── Settings / Theme ──
        'settings.customization': 'Customization',
        'settings.appearance': 'Appearance',
        'settings.brandColor': 'Brand Color',
        'settings.customHex': 'Custom Hex Color',
        'settings.bgStyle': 'Background Style',
        'settings.language': 'Language',
        'settings.light': 'Light',
        'settings.dark': 'Dark',

        // ── Days of Week ──
        'day.sun': 'Sun',
        'day.mon': 'Mon',
        'day.tue': 'Tue',
        'day.wed': 'Wed',
        'day.thu': 'Thu',
        'day.fri': 'Fri',
        'day.sat': 'Sat',
        'day.sunday': 'Sunday',
        'day.monday': 'Monday',
        'day.tuesday': 'Tuesday',
        'day.wednesday': 'Wednesday',
        'day.thursday': 'Thursday',
        'day.friday': 'Friday',
        'day.saturday': 'Saturday',

        // ── Levels ──
        'level.beginner': 'Beginner',
        'level.intermediate': 'Intermediate',
        'level.advanced': 'Advanced',
        'level.pro': 'Pro',

        // ── Focus Areas ──
        'focus.forehand': 'Forehand',
        'focus.backhand': 'Backhand',
        'focus.serve': 'Serve',
        'focus.volley': 'Volley',
        'focus.consistency': 'Consistency',
        'focus.footwork': 'Footwork',

        // ── Focus Options (Program Builder) ──
        'focusOpt.technical': 'Technical',
        'focusOpt.tactical': 'Tactical',
        'focusOpt.physical': 'Physical',
        'focusOpt.matchPlay': 'Match Play',
        'focusOpt.recovery': 'Recovery',
        'focusOpt.serve': 'Serve',

        // ── Program Builder ──
        'pb.title': 'Program Builder',
        'pb.subtitle': 'Design multi-week training blocks',
        'pb.programInfo': 'Program Information',
        'pb.programName': 'Program Name *',
        'pb.programNamePlaceholder': 'e.g. Pre-Season Block, Serve Improvement…',
        'pb.descriptionOptional': 'Description (optional)',
        'pb.descriptionPlaceholder': 'General program objective…',
        'pb.assignTo': 'Assign to (optional)',
        'pb.assignPlaceholder': 'e.g. John Smith, Under-16 Group…',
        'pb.blockDuration': 'Block Duration',
        'pb.weeks': 'Weeks',
        'pb.daysPerWeek': 'Days per week',
        'pb.level': 'Level',
        'pb.totalSessions': 'Total sessions',
        'pb.nextSchedule': 'Next: Schedule',
        'pb.trainingDays': 'Training Days',
        'pb.selectDays': 'Select {n} day(s) of the week to train',
        'pb.training': 'Training:',
        'pb.startDate': 'Start Date',
        'pb.estimatedEnd': 'Estimated end:',
        'pb.back': 'Back',
        'pb.generateWeeks': 'Generate Weeks',
        'pb.weeklyPlan': 'Weekly Plan',
        'pb.weeksAndSessions': '{w} weeks · {s} sessions',
        'pb.intensityProgression': 'Intensity Progression',
        'pb.weekTheme': 'Week Theme',
        'pb.objective': 'Objective',
        'pb.exercises': 'Exercises',
        'pb.addExercisesFromLibrary': 'Add Exercises from Library',
        'pb.reviewProgram': 'Review Program',
        'pb.programSummary': 'Program Summary',
        'pb.sessions': 'Sessions',
        'pb.days': 'Days',
        'pb.assignedTo': 'Assigned to:',
        'pb.weeklyProgression': 'Weekly Progression',
        'pb.createAndAdd': 'Create Program & Add to Calendar',
        'pb.saveBlueprint': 'Save as Blueprint (reusable)',
        'pb.edit': 'Edit',
        'pb.noLinkedTemplate': 'No linked template',
        'pb.addExercises': 'Add Exercises',
        'pb.selected': 'selected',
        'pb.searchExercises': 'Search exercises…',
        'pb.exercisesSelected': 'exercises selected',
        'pb.done': 'Done',
        'pb.noExercisesFound': 'No exercises found',

        // ── Intensity ──
        'intensity.low': 'Low',
        'intensity.medium': 'Medium',
        'intensity.high': 'High',

        // ── Week Themes ──
        'weekTheme.fundamentals': 'Fundamentals',
        'weekTheme.patternDevelopment': 'Pattern Development',
        'weekTheme.pointConstruction': 'Point Construction',
        'weekTheme.matchSimulation': 'Match Simulation',
        'weekTheme.competitiveIntensity': 'Competitive Intensity',
        'weekTheme.recoveryAnalysis': 'Recovery & Analysis',
        'weekTheme.technicalProgression': 'Technical Progression',
        'weekTheme.tacticalPressure': 'Tactical Pressure',

        // ── Progression Themes ──
        'prog.technicalFundamentals': 'Technical Fundamentals',
        'prog.technicalObj': 'Consolidate technical foundations and stroke mechanics',
        'prog.patternDevelopment': 'Pattern Development',
        'prog.patternObj': 'Create repeatable game sequences',
        'prog.pointConstruction': 'Point Construction',
        'prog.pointObj': 'Apply patterns under point pressure',
        'prog.matchSimulation': 'Match Simulation',
        'prog.matchObj': 'Integrate everything in competitive context',

        // ── Category Labels ──
        'cat.all': 'All',
        'cat.baskets': 'Baskets',
        'cat.drill': 'Drill',
        'cat.points': 'Points',
        'cat.game': 'Game',

        // ── Steps ──
        'step.configuration': 'Configuration',
        'step.schedule': 'Schedule',
        'step.weeks': 'Weeks',
        'step.review': 'Review',

        // ── Quick Session Generator ──
        'qs.quickSession': 'Quick Session',
        'qs.selectFilters': 'Select filters to generate',
        'qs.players': 'No. Players',
        'qs.courts': 'No. Courts',
        'qs.level': 'Level',
        'qs.trainingFocus': 'Training Focus',
        'qs.generating': 'Generating…',
        'qs.generateSession': 'Generate Session',
        'qs.sessionGenerated': 'Session Generated!',
        'qs.openSession': 'Open Session',
        'qs.another': 'Another',
        'qs.quickSessionTitle': 'Quick Session - {focus}',
        'qs.autoGenerated': 'Auto-generated: {players} players, {courts} court(s), level {level}',

        // ── Playlists ──
        'pl.deleteProgram': 'Delete this program?',

        // ── TennisBoard ──
        'tb.line': 'Line',
        'tb.circle': 'Circle',
        'tb.draw': 'Draw',
        'tb.erase': 'Erase',
        'tb.text': 'Text',
        'tb.undo': 'Undo',
        'tb.clearAll': 'Clear All',
        'tb.download': 'Download',
        'tb.enterText': 'Enter text:',

        // ── Calendar Event Notes ──
        'cal.eventAdded': 'Event added successfully!',

        // ── General/Shared ──
        'gen.save': 'Save',
        'gen.cancel': 'Cancel',
        'gen.delete': 'Delete',
        'gen.close': 'Close',
        'gen.search': 'Search',
        'gen.loading': 'Loading…',
    },
    es: {
        // ── Navigation & Global ──
        'nav.home': 'Inicio',
        'nav.calendar': 'Calendario',
        'nav.library': 'Biblioteca',
        'nav.sessions': 'Mis Sesiones',
        'nav.team': 'Equipo',
        'nav.network': 'Red',
        'nav.newSession': '+ Nueva Sesión',
        'nav.settings': 'Configuración',

        // ── Settings / Theme ──
        'settings.customization': 'Personalización',
        'settings.appearance': 'Apariencia',
        'settings.brandColor': 'Color de Marca',
        'settings.customHex': 'Hex Personalizado',
        'settings.bgStyle': 'Estilo de Fondo',
        'settings.language': 'Idioma',
        'settings.light': 'Claro',
        'settings.dark': 'Oscuro',

        // ── Days of Week ──
        'day.sun': 'Dom',
        'day.mon': 'Lun',
        'day.tue': 'Mar',
        'day.wed': 'Mié',
        'day.thu': 'Jue',
        'day.fri': 'Vie',
        'day.sat': 'Sáb',
        'day.sunday': 'Domingo',
        'day.monday': 'Lunes',
        'day.tuesday': 'Martes',
        'day.wednesday': 'Miércoles',
        'day.thursday': 'Jueves',
        'day.friday': 'Viernes',
        'day.saturday': 'Sábado',

        // ── Levels ──
        'level.beginner': 'Principiante',
        'level.intermediate': 'Intermedio',
        'level.advanced': 'Avanzado',
        'level.pro': 'Pro',

        // ── Focus Areas ──
        'focus.forehand': 'Derecha',
        'focus.backhand': 'Revés',
        'focus.serve': 'Saque',
        'focus.volley': 'Volea',
        'focus.consistency': 'Consistencia',
        'focus.footwork': 'Juego de pies',

        // ── Focus Options (Program Builder) ──
        'focusOpt.technical': 'Técnico',
        'focusOpt.tactical': 'Táctico',
        'focusOpt.physical': 'Físico',
        'focusOpt.matchPlay': 'Partido',
        'focusOpt.recovery': 'Recuperación',
        'focusOpt.serve': 'Saque',

        // ── Program Builder ──
        'pb.title': 'Constructor de Programa',
        'pb.subtitle': 'Diseña bloques de entrenamiento multi-semana',
        'pb.programInfo': 'Información del Programa',
        'pb.programName': 'Nombre del Programa *',
        'pb.programNamePlaceholder': 'ej. Bloque Pre-Temporada, Mejora de Saque…',
        'pb.descriptionOptional': 'Descripción (opcional)',
        'pb.descriptionPlaceholder': 'Objetivo general del programa…',
        'pb.assignTo': 'Asignar a (opcional)',
        'pb.assignPlaceholder': 'ej. Juan García, Grupo Sub-16…',
        'pb.blockDuration': 'Duración del Bloque',
        'pb.weeks': 'Semanas',
        'pb.daysPerWeek': 'Días por semana',
        'pb.level': 'Nivel',
        'pb.totalSessions': 'Sesiones totales',
        'pb.nextSchedule': 'Siguiente: Horario',
        'pb.trainingDays': 'Días de Entrenamiento',
        'pb.selectDays': 'Selecciona {n} día(s) de la semana para entrenar',
        'pb.training': 'Entrenando:',
        'pb.startDate': 'Fecha de Inicio',
        'pb.estimatedEnd': 'Fin estimado:',
        'pb.back': 'Atrás',
        'pb.generateWeeks': 'Generar Semanas',
        'pb.weeklyPlan': 'Plan Semanal',
        'pb.weeksAndSessions': '{w} semanas · {s} sesiones',
        'pb.intensityProgression': 'Progresión de Intensidad',
        'pb.weekTheme': 'Tema de la Semana',
        'pb.objective': 'Objetivo',
        'pb.exercises': 'Ejercicios',
        'pb.addExercisesFromLibrary': 'Añadir Ejercicios de la Librería',
        'pb.reviewProgram': 'Revisar Programa',
        'pb.programSummary': 'Resumen del Programa',
        'pb.sessions': 'Sesiones',
        'pb.days': 'Días',
        'pb.assignedTo': 'Asignado a:',
        'pb.weeklyProgression': 'Progresión Semanal',
        'pb.createAndAdd': 'Crear Programa y Añadir al Calendario',
        'pb.saveBlueprint': 'Guardar como Blueprint (reutilizable)',
        'pb.edit': 'Editar',
        'pb.noLinkedTemplate': 'Sin plantilla vinculada',
        'pb.addExercises': 'Añadir Ejercicios',
        'pb.selected': 'seleccionados',
        'pb.searchExercises': 'Buscar ejercicios…',
        'pb.exercisesSelected': 'ejercicios seleccionados',
        'pb.done': 'Listo',
        'pb.noExercisesFound': 'No se encontraron ejercicios',

        // ── Intensity ──
        'intensity.low': 'Baja',
        'intensity.medium': 'Media',
        'intensity.high': 'Alta',

        // ── Week Themes ──
        'weekTheme.fundamentals': 'Fundamentos',
        'weekTheme.patternDevelopment': 'Desarrollo de Patrones',
        'weekTheme.pointConstruction': 'Construcción de Punto',
        'weekTheme.matchSimulation': 'Simulación de Partido',
        'weekTheme.competitiveIntensity': 'Intensidad Competitiva',
        'weekTheme.recoveryAnalysis': 'Recuperación y Análisis',
        'weekTheme.technicalProgression': 'Progresión Técnica',
        'weekTheme.tacticalPressure': 'Presión Táctica',

        // ── Progression Themes ──
        'prog.technicalFundamentals': 'Fundamentos Técnicos',
        'prog.technicalObj': 'Consolidar base técnica y mecánica de golpes',
        'prog.patternDevelopment': 'Desarrollo de Patrones',
        'prog.patternObj': 'Crear secuencias de juego repetibles',
        'prog.pointConstruction': 'Construcción de Punto',
        'prog.pointObj': 'Aplicar patrones bajo presión de puntos',
        'prog.matchSimulation': 'Simulación de Partido',
        'prog.matchObj': 'Integrar todo en contexto competitivo',

        // ── Category Labels ──
        'cat.all': 'Todos',
        'cat.baskets': 'Cestas',
        'cat.drill': 'Drill',
        'cat.points': 'Puntos',
        'cat.game': 'Juego',

        // ── Steps ──
        'step.configuration': 'Configuración',
        'step.schedule': 'Horario',
        'step.weeks': 'Semanas',
        'step.review': 'Revisar',

        // ── Quick Session Generator ──
        'qs.quickSession': 'Sesión Rápida',
        'qs.selectFilters': 'Selecciona los filtros para generar',
        'qs.players': 'Nº Jugadores',
        'qs.courts': 'Nº Pistas',
        'qs.level': 'Nivel',
        'qs.trainingFocus': 'Foco de Entreno',
        'qs.generating': 'Generando…',
        'qs.generateSession': 'Generar Sesión',
        'qs.sessionGenerated': '¡Sesión Generada!',
        'qs.openSession': 'Abrir Sesión',
        'qs.another': 'Otra',
        'qs.quickSessionTitle': 'Sesión Rápida - {focus}',
        'qs.autoGenerated': 'Generada automáticamente: {players} jugadores, {courts} pista(s), nivel {level}',

        // ── Playlists ──
        'pl.deleteProgram': '¿Eliminar este programa?',

        // ── TennisBoard ──
        'tb.line': 'Línea',
        'tb.circle': 'Círculo',
        'tb.draw': 'Dibujar',
        'tb.erase': 'Borrar',
        'tb.text': 'Texto',
        'tb.undo': 'Deshacer',
        'tb.clearAll': 'Borrar todo',
        'tb.download': 'Descargar',
        'tb.enterText': 'Escribe el texto:',

        // ── Calendar Event Notes ──
        'cal.eventAdded': '¡Evento añadido exitosamente!',

        // ── General/Shared ──
        'gen.save': 'Guardar',
        'gen.cancel': 'Cancelar',
        'gen.delete': 'Eliminar',
        'gen.close': 'Cerrar',
        'gen.search': 'Buscar',
        'gen.loading': 'Cargando…',
    },
};

// ─── Context ─────────────────────────────────────────────────────────────────
interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        const saved = localStorage.getItem('coach_pocket_language') as Language;
        if (saved && (saved === 'en' || saved === 'es')) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('coach_pocket_language', lang);
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || translations['en'][key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
