import { Box } from '@mui/material';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useFcmToken } from '../hooks/useFcmToken';

export default function MainLayout() {
    const { requestForToken } = useFcmToken();

    useEffect(() => {
        // Solicitar token FCM quando usuário estiver logado
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('Usuário logado, solicitando permissão de notificação...');
                // Pequeno delay para garantir que o UI já foi montado
                setTimeout(() => {
                    requestForToken();
                }, 1000);
            }
        });

        return () => unsubscribe();
    }, [requestForToken]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ flexGrow: 1, pt: { xs: 8, sm: 10 }, pb: { xs: 12, md: 2 }, px: 2 }}>
                <Outlet />
            </Box>
            <BottomNav />
        </Box>
    );
}
