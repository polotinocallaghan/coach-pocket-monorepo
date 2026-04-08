'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useNavigationStore, pageVariants } from '@/lib/navigation-store';
import { useScrollRestoration } from '@/lib/use-scroll-restoration';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

/**
 * Wraps page content with fluid enter/exit animations.
 * Uses spring physics for anti-gravity feel.
 */
export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();
    const { direction } = useNavigationStore();

    // Initialize scroll restoration
    useScrollRestoration();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
