'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigationStore, modalVariants, overlayVariants } from '@/lib/navigation-store';
import { cn } from '@/lib/utils';

interface SpatialModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    preserveBackground?: boolean;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
};

/**
 * Spatial modal that preserves background state.
 * Background remains rendered and optionally interactive.
 */
export function SpatialModal({
    isOpen,
    onClose,
    children,
    className,
    size = 'lg',
    preserveBackground = true
}: SpatialModalProps) {
    const { pushModal, popModal } = useNavigationStore();

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            pushModal({ id: Date.now().toString(), component: 'spatial-modal' });
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll but keep position
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            if (isOpen) popModal();
        };
    }, [isOpen, handleKeyDown, pushModal, popModal]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop with blur - background stays alive */}
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onClick={onClose}
                        className={cn(
                            "absolute inset-0",
                            preserveBackground
                                ? "bg-black/60 backdrop-blur-sm"
                                : "bg-black/90"
                        )}
                    />

                    {/* Modal Content */}
                    <motion.div
                        variants={modalVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={cn(
                            "relative z-10 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col",
                            sizeClasses[size],
                            "w-full max-h-[90vh]",
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <motion.button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="w-5 h-5" />
                        </motion.button>

                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface SpatialModalHeaderProps {
    children: ReactNode;
    className?: string;
}

export function SpatialModalHeader({ children, className }: SpatialModalHeaderProps) {
    return (
        <div className={cn("p-6 border-b border-slate-700 flex-shrink-0", className)}>
            {children}
        </div>
    );
}

interface SpatialModalBodyProps {
    children: ReactNode;
    className?: string;
}

export function SpatialModalBody({ children, className }: SpatialModalBodyProps) {
    return (
        <div className={cn("flex-1 overflow-y-auto p-6", className)}>
            {children}
        </div>
    );
}

interface SpatialModalFooterProps {
    children: ReactNode;
    className?: string;
}

export function SpatialModalFooter({ children, className }: SpatialModalFooterProps) {
    return (
        <div className={cn("p-6 border-t border-slate-700 flex-shrink-0 bg-slate-800/50", className)}>
            {children}
        </div>
    );
}
