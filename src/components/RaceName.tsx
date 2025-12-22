import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Typography, Skeleton } from '@mui/material';
import type { Race } from '../types';

interface RaceNameProps {
    raceId: string;
    variant?: 'body1' | 'body2' | 'h6' | 'subtitle1' | 'subtitle2' | 'caption' | 'overline';
    fontWeight?: string | number;
    color?: string;
}

// Simple in-memory cache to avoid repeated fetches for the same race in a session
const raceCache: Record<string, string> = {};

export default function RaceName({ raceId, variant = 'body2', fontWeight, color = 'text.secondary' }: RaceNameProps) {
    const [name, setName] = useState<string | null>(raceCache[raceId] || null);
    const [loading, setLoading] = useState(!raceCache[raceId]);

    useEffect(() => {
        if (raceCache[raceId]) {
            setName(raceCache[raceId]);
            setLoading(false);
            return;
        }

        const fetchRace = async () => {
            try {
                const raceDoc = await getDoc(doc(db, 'races', raceId));
                if (raceDoc.exists()) {
                    const race = raceDoc.data() as Race;
                    // Prefer eventName, fallback to trackName or a formatted version
                    const displayName = race.eventName || race.trackName || 'Etapa Desconhecida';
                    raceCache[raceId] = displayName;
                    setName(displayName);
                } else {
                    const fallbackName = 'Etapa Desconhecida';
                    raceCache[raceId] = fallbackName;
                    setName(fallbackName);
                }
            } catch (error) {
                console.error("Error fetching race name:", error);
                const fallbackName = 'Etapa Desconhecida';
                raceCache[raceId] = fallbackName;
                setName(fallbackName);
            } finally {
                setLoading(false);
            }
        };

        fetchRace();
    }, [raceId]);

    if (loading) {
        return <Skeleton variant="text" width={120} sx={{ display: 'inline-block' }} />;
    }

    return (
        <Typography component="span" variant={variant} fontWeight={fontWeight} color={color}>
            {name}
        </Typography>
    );
}
