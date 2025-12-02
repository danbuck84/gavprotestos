import { useState, useEffect } from 'react';
import { Paper, BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
                    if (newValue === -1) {
                        navigate(-1); // Back button
                    } else if (newValue === 0) {
                        navigate('/');
                    } else if (newValue === 1) {
                        navigate('/novo-protesto');
                    } else if (newValue === 2) {
                        if (auth.currentUser) navigate(`/admin/piloto/${auth.currentUser.uid}`);
                        else navigate('/login');
                    } else if (newValue === 3) {
                        navigate('/admin');
                    }
                }}
            >
                {location.pathname !== '/' && (
                    <BottomNavigationAction
                        value={-1}
                        label="VOLTAR"
                        icon={<ArrowBackIcon sx={{ color: '#fff' }} />}
                        sx={{
                            minWidth: 60,
                            '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' }
                        }}
                    />
                )}
                <BottomNavigationAction label="Início" icon={<DashboardIcon />} value={0} />
                <BottomNavigationAction
                    label="Novo"
                    icon={<AddCircleOutlineIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />}
                    sx={{
                        '& .MuiBottomNavigationAction-label': { fontWeight: 'bold' }
                    }}
                    value={1}
                />
                <BottomNavigationAction label="Perfil" icon={<PersonIcon />} value={2} />
                {userRole === 'admin' && (
                    <BottomNavigationAction label="Admin" icon={<AdminPanelSettingsIcon />} value={3} />
                )}
            </BottomNavigation>
        </Paper>
    );
}
