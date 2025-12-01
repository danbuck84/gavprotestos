import { useState, useEffect } from 'react';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Button, Chip, CircularProgress, Snackbar, Alert, Box
} from '@mui/material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { User } from '../types';
import { isAdmin, isSuperAdmin, SUPER_ADMIN_ID } from '../utils/permissions';
import { useNavigate } from 'react-router-dom';

export default function AdminUsers() {
    const navigate = useNavigate();
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
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users", error);
                setSnackbar({ open: true, message: "Erro ao carregar usuários.", severity: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleToggleAdmin = async (user: User) => {
        if (!currentUserUid) return;

        // Security check: Only Super Admin can demote an Admin
        if (user.role === 'admin' && !isSuperAdmin(currentUserUid)) {
            setSnackbar({ open: true, message: "Apenas o Super Admin pode remover admins.", severity: 'error' });
            return;
        }

        const newRole = user.role === 'admin' ? 'driver' : 'admin';

        try {
            await updateDoc(doc(db, 'users', user.uid), { role: newRole });

            setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
            setSnackbar({
                open: true,
                message: `Usuário ${newRole === 'admin' ? 'promovido a Admin' : 'rebaixado a Piloto'}.`,
                severity: 'success'
            });
        } catch (error) {
            console.error("Error updating user role", error);
            setSnackbar({ open: true, message: "Erro ao atualizar permissões.", severity: 'error' });
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button onClick={() => navigate('/admin')} sx={{ mb: 2 }}>
                &lt; Voltar ao Painel
            </Button>
            <Typography variant="h4" gutterBottom>Gestão de Usuários</Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Steam ID</TableCell>
                            <TableCell>Função</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell>{user.displayName || 'Sem Nome'}</TableCell>
                                <TableCell>{user.uid}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={isSuperAdmin(user.uid) ? 'SUPER ADMIN' : (user.role === 'admin' ? 'ADMIN' : 'PILOTO')}
                                        color={isSuperAdmin(user.uid) ? 'secondary' : (user.role === 'admin' ? 'primary' : 'default')}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    {!isSuperAdmin(user.uid) && (
                                        <Button
                                            variant={user.role === 'admin' ? "outlined" : "contained"}
                                            color={user.role === 'admin' ? "error" : "primary"}
                                            size="small"
                                            onClick={() => handleToggleAdmin(user)}
                                            disabled={user.role === 'admin' && !isSuperAdmin(currentUserUid)}
                                        >
                                            {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
