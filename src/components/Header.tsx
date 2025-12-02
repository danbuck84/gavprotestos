import { AppBar, Toolbar, Box, IconButton, Avatar, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

import { useLocation } from 'react-router-dom';

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = auth.currentUser;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleClose();
        await signOut(auth);
        navigate('/login');
    };

    const handleProfile = () => {
        handleClose();
        if (user) navigate(`/admin/piloto/${user.uid}`);
    };

    return (
        <AppBar position="fixed" color="transparent" elevation={0} sx={{ bgcolor: 'background.default', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '0 1 auto' }}>
                    {location.pathname !== '/' && (
                        <Typography
                            onClick={() => navigate(-1)}
                            sx={{
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                mr: 2,
                                color: 'primary.main',
                                userSelect: 'none'
                            }}
                        >
                            &lt;
                        </Typography>
                    )}
                    <Box
                        component="img"
                        src="/gavprotestos-logo.png"
                        alt="GAV Protestos"
                        sx={{ height: 40, cursor: 'pointer' }}
                        onClick={() => navigate('/')}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {user && <NotificationBell />}

                    {user ? (
                        <>
                            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                                <Avatar src={user.photoURL || undefined} alt={user.displayName || 'User'}>
                                    {user.displayName?.[0] || 'U'}
                                </Avatar>
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                <MenuItem onClick={handleProfile}>Meu Perfil</MenuItem>
                                <MenuItem onClick={handleLogout}>Sair</MenuItem>
                            </Menu>
                        </>
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
