import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Typography, Skeleton } from '@mui/material';
import type { User, Race } from '../types';

interface UserNameProps {
    uid: string;
    variant?: 'body1' | 'body2' | 'h6' | 'subtitle1' | 'subtitle2' | 'caption' | 'overline';
    fontWeight?: string | number;
    color?: string;
}

// Simple in-memory cache to avoid repeated fetches for the same user in a session
const userCache: Record<string, string> = {};

export default function UserName({ uid, variant = 'body1', fontWeight, color }: UserNameProps) {
    const [name, setName] = useState<string | null>(userCache[uid] || null);
    const [loading, setLoading] = useState(!userCache[uid]);

    useEffect(() => {
        if (userCache[uid]) {
            setName(userCache[uid]);
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                // Handle potential 'steam:' prefix if it exists in the ID but not in the doc ID
                const cleanId = uid.replace('steam:', '');

                // PRIORITY 1: Check all races for driver name (most reliable)
                try {
                    const racesSnapshot = await getDocs(collection(db, 'races'));
                    let foundName: string | null = null;

                    for (const raceDoc of racesSnapshot.docs) {
                        const race = raceDoc.data() as Race;
                        if (race.drivers && Array.isArray(race.drivers)) {
                            const driver = race.drivers.find(d =>
                                d.steamId === cleanId || d.steamId === uid || d.steamId === `steam:${cleanId}`
                            );
                            if (driver && driver.name) {
                                foundName = driver.name;
                                break;
                            }
                        }
                    }

                    if (foundName) {
                        userCache[uid] = foundName;
                        setName(foundName);
                        setLoading(false);
                        return;
                    }
                } catch (raceError) {
                    console.warn('Error searching races for driver name:', raceError);
                }

                // PRIORITY 2: Check Firestore users collection
                const userDoc = await getDoc(doc(db, 'users', cleanId));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    const displayName = userData.displayName || 'Piloto Desconhecido';
                    userCache[uid] = displayName;
                    setName(displayName);
                } else {
                    // PRIORITY 3: Final fallback
                    const fallbackName = 'Piloto Desconhecido';
                    userCache[uid] = fallbackName;
                    setName(fallbackName);
                }
            } catch (error) {
                console.error("Error fetching user name:", error);
                const fallbackName = 'Piloto Desconhecido';
                userCache[uid] = fallbackName;
                setName(fallbackName);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [uid]);

    if (loading) {
        return <Skeleton variant="text" width={100} sx={{ display: 'inline-block' }} />;
    }

    return (
        <Typography component="span" variant={variant} fontWeight={fontWeight} color={color}>
            {name}
        </Typography>
    );
}
