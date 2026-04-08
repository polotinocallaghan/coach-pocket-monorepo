"use client";

import React, { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";
import { dataStore } from "../store";
import { useAppConfig } from "../config/AppConfigContext";

interface AuthGuardOptions {
    requireAuth?: boolean;
    requireRole?: "coach" | "player";
    allowGuest?: boolean;
}

export function withAuthGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    options: AuthGuardOptions = {}
) {
    return function AuthGuardedComponent(props: P) {
        const { user, loading, isGuest, firestoreReady } = useAuth();
        const router = useRouter();
        const appConfig = useAppConfig();

        useEffect(() => {
            if (!loading && firestoreReady) {
                const { requireAuth = true, allowGuest = true } = options;
                
                // Wait for the profile to be loaded if the user is authenticated 
                const profile = dataStore.getUserProfile();

                if (requireAuth && !user && !isGuest) {
                    router.push("/login");
                }

                if (requireAuth && !user && isGuest && !allowGuest) {
                    router.push("/login");
                }

                // If user is authenticated, verify their role and context against the app's configuration
                if (user && profile) {
                    const effectiveRole = dataStore.getEffectiveRole() || profile.role;
                    const expectedRole = options.requireRole || appConfig.appRole;
                    
                    const isRoleMismatch = effectiveRole !== expectedRole;
                    const isContextMismatch = profile.appContext && profile.appContext !== (appConfig.isNCAA ? 'ncaa' : 'standard');

                    if (isRoleMismatch || isContextMismatch) {
                        // Redirect to an appropriate place, e.g., login or an error page
                        // For a clean implementation, redirect to login
                        router.push("/login");
                    }
                }
            }
        }, [user, loading, isGuest, firestoreReady, router, appConfig]);

        if (loading || !firestoreReady) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            );
        }

        // Apply restrictions synchronously to avoid flash of content
        const { requireAuth = true, allowGuest = true } = options;
        
        if (requireAuth && !user && !isGuest) {
            return null; // Will redirect in useEffect
        }
        
        if (requireAuth && !user && isGuest && !allowGuest) {
             return null; // Will redirect in useEffect
        }

        if (user) {
             const profile = dataStore.getUserProfile();
             if (profile) {
                 const effectiveRole = dataStore.getEffectiveRole() || profile.role;
                 const expectedRole = options.requireRole || appConfig.appRole;
                 
                 const isRoleMismatch = effectiveRole !== expectedRole;
                 const isContextMismatch = profile.appContext && profile.appContext !== (appConfig.isNCAA ? 'ncaa' : 'standard');

                 if (isRoleMismatch || isContextMismatch) {
                     return null; // Will redirect in useEffect
                 }
             }
        }

        return <WrappedComponent {...props} />;
    };
}
