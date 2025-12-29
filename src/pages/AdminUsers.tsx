import { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Button, Chip, CircularProgress, Snackbar, Alert, Box, List, ListItem, Divider
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import type { User } from '../types';
import { isSuperAdmin } from '../utils/permissions';

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const currentUserUid = auth.currentUser?.uid;

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersData = querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                })) as User[];

                // Remove duplicates by uid
                const uniqueUsers = Array.from(new Map(usersData.map(user => [user.uid, user])).values());

                setUsers(uniqueUsers);
            } catch (error) {
                console.error("Error fetching users", error);
                setSnackbar({ open: true, message: "Erro ao carregar usuários.", severity: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []); // Empty dependency array to run only once

    const handleToggleAdmin = async (user: User) => {
        if (!currentUserUid) return;

        // Security check: Only Super Admin can demote an Admin
        // Note: The strict check is on the backend (Cloud Function). 
        // We relax the UI check slightly to allow the bootstrap user (you) to use it if needed, 
        // or just let the backend reject it if unauthorized.

        setLoading(true);

        const newRole = user.role === 'admin' ? 'driver' : 'admin';

        try {
            const toggleUserRole = httpsCallable(functions, 'toggleUserRole');
            await toggleUserRole({ targetUid: user.uid, targetRole: newRole });

            setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
            setSnackbar({
                open: true,
                message: `Usuário ${newRole === 'admin' ? 'promovido a Admin' : 'rebaixado a Piloto'}.`,
                severity: 'success'
            });
        } catch (error: any) {
            console.error("Error updating user role", error);
            const errorMessage = error.message || "Erro ao atualizar permissões.";
            setSnackbar({ open: true, message: `Erro: ${errorMessage}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>Gestão de Usuários</Typography>

            <Paper elevation={2}>
                <List>
                    {users.map((user, index) => (
                        <Box key={user.uid}>
                            <ListItem
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 2,
                                    py: 3
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
                                            {user.displayName || `Usuário ${user.uid.substring(user.uid.length - 4)}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', fontSize: '0.7rem' }}>
                                            {user.uid}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={isSuperAdmin(user.uid) ? 'SUPER ADMIN' : (user.role === 'admin' ? 'ADMIN' : 'PILOTO')}
                                        color={isSuperAdmin(user.uid) ? 'secondary' : (user.role === 'admin' ? 'primary' : 'default')}
                                        size="small"
                                    />
                                </Box>

                                {!isSuperAdmin(user.uid) && (
                                    <Button
                                        variant={user.role === 'admin' ? "outlined" : "contained"}
                                        color={user.role === 'admin' ? "error" : "primary"}
                                        size="small"
                                        onClick={() => handleToggleAdmin(user)}
                                        disabled={user.role === 'admin' && !isSuperAdmin(currentUserUid)}
                                        fullWidth
                                    >
                                        {user.role === 'admin' ? 'Remover Permissão de Admin' : 'Tornar Admin'}
                                    </Button>
                                )}
                            </ListItem>
                            {index < users.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            </Paper>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
