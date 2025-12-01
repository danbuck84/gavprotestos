import { Box } from '@mui/material';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: { xs: 10, md: 0 } }}>
            <Header />
            <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
                <Outlet />
            </Box>
            <BottomNav />
        </Box>
    );
}
