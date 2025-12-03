import { AppBar, Toolbar, Box, IconButton, Avatar, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { auth } from '../firebase';
import { getInitials } from '../utils/stringUtils';

export default function Header() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const handleProfile = () => {
        if (user) navigate(`/admin/piloto/${user.uid}`);
    };

    return (
        <AppBar position="fixed" color="transparent" elevation={0} sx={{ bgcolor: 'background.default', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
                <Box
                    component="img"
                    src="/gavprotestos-logo.png"
                    alt="GAV Protestos"
                    sx={{ height: 40, cursor: 'pointer' }}
                    onClick={() => navigate('/')}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {user && <NotificationBell />}

                    {user ? (
                        <IconButton onClick={handleProfile} sx={{ p: 0 }}>
                            <Avatar src={user.photoURL || undefined} alt={user.displayName || 'User'}>
                                {getInitials(user.displayName)}
                            </Avatar>
                        </IconButton>
                    ) : !user ? (
                        <Typography
                            variant="button"
                            onClick={() => navigate('/login')}
                            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            LOGIN
                        </Typography>
                    ) : null}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
