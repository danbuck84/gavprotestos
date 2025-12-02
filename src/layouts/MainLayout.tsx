import { Box } from '@mui/material';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
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
