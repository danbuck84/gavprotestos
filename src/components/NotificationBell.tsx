import { useState, useEffect } from 'react';
import {
    IconButton, Badge, Menu, MenuItem, Typography, Box,
    List, ListItem, ListItemText, Divider, ListItemButton
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: any;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, 'users', auth.currentUser.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, []);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = async (notification: Notification) => {
        handleClose();

        if (!notification.read && auth.currentUser) {
            try {
                await updateDoc(doc(db, 'users', auth.currentUser.uid, 'notifications', notification.id), {
                    read: true
                });
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }

        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <>
            <IconButton color="inherit" onClick={handleOpen}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    style: {
                        maxHeight: 400,
                        width: 350,
                    },
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                    <Typography variant="h6">Notificações</Typography>
                </Box>
                {notifications.length === 0 ? (
                    <MenuItem disabled>
                        <Typography variant="body2">Nenhuma notificação.</Typography>
                    </MenuItem>
                ) : (
                    <List sx={{ p: 0 }}>
                        {notifications.map((notification) => (
                            <div key={notification.id}>
                                <ListItemButton
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle2" fontWeight={notification.read ? 'normal' : 'bold'}>
                                                {notification.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.primary" sx={{ display: 'block', my: 0.5 }}>
                                                    {notification.message}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {notification.createdAt?.toDate().toLocaleString()}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItemButton>
                                <Divider />
                            </div>
                        ))}
                    </List>
                )}
            </Menu>
        </>
    );
}
