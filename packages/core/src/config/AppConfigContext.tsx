"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface AppConfigContextType {
    isNCAA: boolean;
    appRole: "coach" | "player";
}

const AppConfigContext = createContext<AppConfigContextType>({
    isNCAA: false,
    appRole: "coach"
});

export const useAppConfig = () => useContext(AppConfigContext);

export function AppConfigProvider({ 
    children, 
    isNCAA, 
    appRole 
}: { 
    children: ReactNode; 
    isNCAA: boolean; 
    appRole: "coach" | "player"; 
}) {
    return (
        <AppConfigContext.Provider value={{ isNCAA, appRole }}>
            {children}
        </AppConfigContext.Provider>
    );
}
