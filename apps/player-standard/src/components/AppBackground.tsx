'use client';

import { useTheme } from '@/lib/ThemeContext';
import Aurora from './reactbits/Aurora';

export function AppBackground() {
    const { theme, primaryColor, backgroundStyle } = useTheme();

    // Map primary color to gradient stops for Aurora
    // Create variations of the primary color
    // This is simple: same color but relies on Aurora's logic to mix them
    // Or we could calculate lighter/darker shades if needed, but keeping it simple for now
    const colorStops = [primaryColor, '#5227FF', primaryColor];
    // A better approach might be to generate stops based on the primary color

    if (backgroundStyle === 'aurora') {
        return (
            <div className="fixed inset-0 -z-50 pointer-events-none">
                {/* Base background color */}
                <div className="absolute inset-0 bg-background transition-colors duration-500" />

                {/* Aurora Effect */}
                <div className="absolute inset-0 opacity-50">
                    <Aurora
                        colorStops={[primaryColor, '#ffffff', primaryColor]}
                        speed={0.5}
                        amplitude={1.2}
                    />
                </div>

                {/* Gradient Overlay for subtle look */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
            </div>
        );
    }

    if (backgroundStyle === 'gradient') {
        return (
            <div className="fixed inset-0 -z-50 pointer-events-none">
                <div className="absolute inset-0 bg-background transition-colors duration-500" />
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(circle at 50% 0%, ${primaryColor}40, transparent 70%), radial-gradient(circle at 0% 100%, ${primaryColor}20, transparent 50%)`
                    }}
                />
            </div>
        );
    }

    // Default 'solid' style
    return (
        <div className="fixed inset-0 -z-50 pointer-events-none bg-background transition-colors duration-500" />
    );
}
