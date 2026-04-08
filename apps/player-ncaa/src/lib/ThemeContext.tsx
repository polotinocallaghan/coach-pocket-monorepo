'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type BackgroundStyle = 'solid' | 'gradient' | 'aurora';

interface ThemeContextType {
    theme: Theme;
    primaryColor: string;
    backgroundStyle: BackgroundStyle;
    setTheme: (theme: Theme) => void;
    setPrimaryColor: (color: string) => void;
    setBackgroundStyle: (style: BackgroundStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [primaryColor, setPrimaryColor] = useState('#22c55e'); // Default green-500
    const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('solid');

    useEffect(() => {
        // Load saved settings
        const savedTheme = localStorage.getItem('theme') as Theme;
        const savedColor = localStorage.getItem('primaryColor');
        const savedBg = localStorage.getItem('backgroundStyle') as BackgroundStyle;

        if (savedTheme) setTheme(savedTheme);
        if (savedColor) setPrimaryColor(savedColor);
        if (savedBg) setBackgroundStyle(savedBg);
    }, []);

    useEffect(() => {
        // Apply theme class
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);

        // Apply primary color variable
        root.style.setProperty('--primary', primaryColor);
        localStorage.setItem('primaryColor', primaryColor);

        // Apply background logic if needed, or store for components to react
        localStorage.setItem('backgroundStyle', backgroundStyle);

    }, [theme, primaryColor, backgroundStyle]);

    return (
        <ThemeContext.Provider value={{
            theme,
            primaryColor,
            backgroundStyle,
            setTheme,
            setPrimaryColor,
            setBackgroundStyle
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
