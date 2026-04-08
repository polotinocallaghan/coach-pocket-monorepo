'use client';

import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigationStore, drawerVariants, overlayVariants } from '@/lib/navigation-store';
import { cn } from '@/lib/utils';

interface SpatialDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    side?: 'left' | 'right';
    width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
    xl: 'w-[600px]',
};

const drawerVariantsLeft = {
    initial: { x: '-100%' },
    animate: {
        x: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 350,
            damping: 35,
            mass: 0.7,
        },
    },
    exit: {
        x: '-100%',
        transition: {
            type: 'spring' as const,
            stiffness: 350,
            damping: 35,
            mass: 0.7,
        },
    },
};

/**
 * Spatial drawer that slides in from edge.
 * Supports swipe-to-dismiss with momentum.
 */
export function SpatialDrawer({
    isOpen,
    onClose,
    children,
    className,
    side = 'right',
    width = 'md'
}: SpatialDrawerProps) {
    const { openDrawer, closeDrawer } = useNavigationStore();
    const dragControls = useDragControls();
    const constraintsRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            openDrawer('spatial-drawer');
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            if (isOpen) closeDrawer();
        };
    }, [isOpen, handleKeyDown, openDrawer, closeDrawer]);

    // Handle drag end for swipe-to-dismiss
    const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
        const threshold = 100; // Minimum distance to trigger close
        const velocity = 500; // Minimum velocity to trigger close

        if (side === 'right') {
            if (info.offset.x > threshold || info.velocity.x > velocity) {
                onClose();
            }
        } else {
            if (info.offset.x < -threshold || info.velocity.x < -velocity) {
                onClose();
            }
        }
    }, [side, onClose]);

    const variants = side === 'right' ? drawerVariants : drawerVariantsLeft;

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    ref={constraintsRef}
                    className="fixed inset-0 z-[100] flex"
                >
                    {/* Backdrop */}
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer Content */}
                    <motion.div
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        drag="x"
                        dragControls={dragControls}
                        dragConstraints={{
                            left: side === 'right' ? 0 : undefined,
                            right: side === 'left' ? 0 : undefined
                        }}
                        dragElastic={0.1}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            "absolute top-0 bottom-0 bg-slate-800 border-slate-700 shadow-2xl shadow-black/50 overflow-hidden flex flex-col",
                            side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
                            widthClasses[width],
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div
                            className={cn(
                                "absolute top-1/2 -translate-y-1/2 w-1 h-12 bg-slate-600 rounded-full cursor-grab active:cursor-grabbing",
                                side === 'right' ? 'left-2' : 'right-2'
                            )}
                            onPointerDown={(e) => dragControls.start(e)}
                        />

                        {/* Close Button */}
                        <motion.button
                            onClick={onClose}
                            className={cn(
                                "absolute top-4 z-20 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition",
                                side === 'right' ? 'left-4' : 'right-4'
                            )}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="w-5 h-5" />
                        </motion.button>

                        <div className="flex-1 overflow-y-auto pt-16">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
