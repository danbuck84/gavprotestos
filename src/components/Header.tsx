import { AppBar, Toolbar, Typography, Box, IconButton, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
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
                    {/* Suporte Icon */}
                    {user && (
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/suporte')}
                            aria-label="suporte"
                            title="Fale Conosco"
                        >
                            <SupportAgentIcon />
                        </IconButton>
                    )}

                    {/* Notification Bell */}
                    {user && <NotificationBell />}

                    {/* User Profile */}
                    {user ? (
                        <IconButton onClick={handleProfile} sx={{ p: 0 }}>
                            <Avatar src={user.photoURL || undefined} alt={user.displayName || 'User'}>
                                {getInitials(user.displayName)}
                            </Avatar>
                        </IconButton>
                    ) : (
                        <Typography
                            variant="button"
                            onClick={() => navigate('/login')}
                            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            LOGIN
                        </Typography>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
