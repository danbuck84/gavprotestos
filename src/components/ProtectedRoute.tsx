import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CircularProgress, Box } from '@mui/material';
import type { User } from '../types';

interface ProtectedRouteProps {
    children: React.JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Check Firestore for role
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = { uid: currentUser.uid, ...userDoc.data() } as User;
                        if (isAdmin(userData)) {
                            setAuthorized(true);
                        }
                    } else {
                        // If user doc doesn't exist, check if it's super admin by ID
                        if (isAdmin({ uid: currentUser.uid, displayName: null, photoURL: null, role: undefined })) {
                            setAuthorized(true);
                        }
                    }
                } catch (error) {
                    console.error("Error checking admin status", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!authorized) {
        return <Navigate to="/" replace />;
    }

    return children;
}
