import { Box } from '@mui/material';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useFcmToken } from '../hooks/useFcmToken';

export default function MainLayout() {
    const { requestForToken } = useFcmToken();
    const notificationRequested = useRef(false);

    useEffect(() => {
        // Solicitar token FCM quando usuário estiver logado (apenas uma vez)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !notificationRequested.current) {
                console.log('Usuário logado, solicitando permissão de notificação...');
                notificationRequested.current = true; // Trava imediata para evitar loop

                // Pequeno delay para garantir que o UI já foi montado
                setTimeout(() => {
                    requestForToken();
                }, 1000);
            }
        });

        return () => unsubscribe();
    }, []); // Dependências vazias - executa apenas na montagem

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
