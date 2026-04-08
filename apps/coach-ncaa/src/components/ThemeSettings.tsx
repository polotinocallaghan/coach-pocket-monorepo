'use client';

import { useTheme } from '@/lib/ThemeContext';
import { useLanguage } from '@/lib/LanguageContext';
import { Settings, X, Moon, Sun, Palette, Globe } from 'lucide-react';
import { useState } from 'react';

const PRESET_COLORS = [
    { name: 'Coach Green', value: '#22c55e' },
    { name: 'Ocean Blue', value: '#3b82f6' },
    { name: 'Royal Purple', value: '#a855f7' },
    { name: 'Crimson Red', value: '#ef4444' },
    { name: 'Sunset Orange', value: '#f97316' },
    { name: 'Slate Grey', value: '#64748b' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' },
];

export function ThemeSettings() {
    const { theme, setTheme, primaryColor, setPrimaryColor, backgroundStyle, setBackgroundStyle } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 p-3 bg-slate-800 text-slate-400 hover:text-white rounded-full shadow-lg border border-slate-700 hover:border-slate-500 transition-all z-50 hover:scale-110"
                title="Theme Settings"
            >
                <Settings className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" style={{ color: primaryColor }} />
                        {t('settings.customization')}
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Language Toggle */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            {t('settings.language')}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${language === 'en'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 ring-2 ring-offset-2 ring-blue-500 ring-offset-slate-900'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <span className="text-lg">🇺🇸</span>
                                English
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${language === 'es'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 ring-2 ring-offset-2 ring-blue-500 ring-offset-slate-900'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <span className="text-lg">🇪🇸</span>
                                Español
                            </button>
                        </div>
                    </div>

                    {/* Theme Mode */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('settings.appearance')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light'
                                    ? 'bg-white text-slate-900 border-white ring-2 ring-offset-2 ring-primary ring-offset-slate-900'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <Sun className="w-5 h-5" />
                                {t('settings.light')}
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark'
                                    ? 'bg-slate-950 text-white border-slate-800 ring-2 ring-offset-2 ring-primary ring-offset-slate-900'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <Moon className="w-5 h-5" />
                                {t('settings.dark')}
                            </button>
                        </div>
                    </div>

                    {/* Primary Color */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('settings.brandColor')}</label>
                        <div className="grid grid-cols-4 gap-3">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setPrimaryColor(color.value)}
                                    className={`group relative h-12 w-full rounded-xl transition-all ${primaryColor === color.value ? 'ring-2 ring-offset-2 ring-white ring-offset-slate-900 scale-105' : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                >
                                    {primaryColor === color.value && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="pt-2">
                            <label className="text-xs text-slate-500 mb-1 block">{t('settings.customHex')}</label>
                            <div className="flex gap-2">
                                <div className="w-10 h-10 rounded-lg border border-slate-700" style={{ backgroundColor: primaryColor }} />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 text-white text-sm font-mono focus:outline-none focus:border-primary"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Background Style */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('settings.bgStyle')}</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['solid', 'gradient', 'aurora'] as const).map((style) => (
                                <button
                                    key={style}
                                    onClick={() => setBackgroundStyle(style)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${backgroundStyle === style
                                        ? 'bg-slate-800 border-primary text-white ring-1 ring-primary'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="w-full aspect-video rounded-md bg-slate-900 overflow-hidden relative">
                                        {style === 'solid' && <div className="absolute inset-0 bg-slate-900" />}
                                        {style === 'gradient' && <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />}
                                        {style === 'aurora' && <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 via-slate-900 to-purple-500/20" />}
                                    </div>
                                    <span className="text-xs font-medium capitalize">{style}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
