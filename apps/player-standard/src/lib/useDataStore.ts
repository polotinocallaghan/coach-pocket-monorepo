import { useState, useEffect } from 'react';
import { dataStore } from '@coach-pocket/core';

/**
 * A custom hook that allows React components to subscribe to DataStore updates.
 * Whenever the DataStore fires a notification (e.g., via Firebase onSnapshot),
 * this hook will re-evaluate the selector and trigger a component re-render
 * automatically, achieving 100% Real-time Updates natively.
 *
 * @param selector A function that returns the desired data from dataStore.
 * @returns The up-to-date data.
 */
export function useDataStore<T>(selector: () => T): T {
    const [data, setData] = useState<T>(selector());

    useEffect(() => {
        // Initial setup to guarantee freshness
        setData(selector());

        // Subscribe to all future dataStore changes
        const unsubscribe = dataStore.subscribe(() => {
            setData(selector());
        });

        return () => unsubscribe();
    }, []); // Empty deps because selector results change, but the dataStore is global

    return data;
}
