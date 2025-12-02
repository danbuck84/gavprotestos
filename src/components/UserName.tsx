import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Typography, Skeleton } from '@mui/material';
import type { User } from '../types';

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
                // Assuming doc IDs are just the numbers or the full string. 
                // Based on previous context, IDs might be just numbers.
                const cleanId = uid.replace('steam:', '');

                const userDoc = await getDoc(doc(db, 'users', cleanId));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    const displayName = userData.displayName || `User ${cleanId.slice(-4)}`;
                    userCache[uid] = displayName;
                    setName(displayName);
                } else {
                    // Fallback if user not found (maybe just a steam ID not registered yet)
                    setName(uid);
                }
            } catch (error) {
                console.error("Error fetching user name:", error);
                setName(uid);
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
