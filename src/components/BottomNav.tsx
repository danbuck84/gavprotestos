import { useState, useEffect } from 'react';
import { Paper, BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../types';
import { isAdmin } from '../utils/permissions';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [value, setValue] = useState(0);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = { ...userDoc.data(), uid: firebaseUser.uid } as User;
                        const adminStatus = isAdmin(userData);
                        setUserRole(adminStatus ? 'admin' : 'driver');
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            } else {
                setUserRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (location.pathname === '/') setValue(0);
        else if (location.pathname === '/novo-protesto') setValue(1);
        else if (location.pathname.startsWith('/admin/piloto')) setValue(2);
        else if (location.pathname.startsWith('/admin')) setValue(3);
    }, [location]);

    if (!isMobile) return null;

    return (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
            <BottomNavigation
                showLabels
                value={value}
                onChange={(_, newValue) => {
                    setValue(newValue);
                    switch (newValue) {
                        case 0: navigate('/'); break;
                        case 1: navigate('/novo-protesto'); break;
                        case 2:
                            if (auth.currentUser) navigate(`/admin/piloto/${auth.currentUser.uid}`);
                            else navigate('/login');
                            break;
                        case 3: navigate('/admin'); break;
                    }
                }}
            >
                <BottomNavigationAction label="Início" icon={<DashboardIcon />} />
                <BottomNavigationAction
                    label="Novo"
                    icon={<AddCircleOutlineIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />}
                    sx={{
                        '& .MuiBottomNavigationAction-label': { fontWeight: 'bold' }
                    }}
                />
                <BottomNavigationAction label="Perfil" icon={<PersonIcon />} />
                {userRole === 'admin' && (
                    <BottomNavigationAction label="Admin" icon={<AdminPanelSettingsIcon />} />
                )}
            </BottomNavigation>
        </Paper>
    );
}
