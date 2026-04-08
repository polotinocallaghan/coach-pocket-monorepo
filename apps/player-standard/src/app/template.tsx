'use client';

import { PageTransition } from "@/components/navigation";
import { ReactNode } from "react";

/**
 * Next.js template file - re-renders on every navigation.
 * Wraps each page with PageTransition for fluid animations.
 */
export default function Template({ children }: { children: ReactNode }) {
    return (
        <PageTransition>
            {children}
        </PageTransition>
    );
}
