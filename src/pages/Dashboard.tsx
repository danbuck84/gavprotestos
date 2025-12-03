import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, updateProfile, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, setDoc } from 'firebase/firestore';
import type { Protest } from '../types';

import ProtestCard from '../components/ProtestCard';
import UserName from '../components/UserName';
import { translateStatus } from '../utils/translations';
import { formatDateOnly } from '../utils/dateUtils';

export default function Dashboard() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [user, setUser] = useState<User | null>(null);
    const [protests, setProtests] = useState<Protest[]>([]);
    const [loadingProtests, setLoadingProtests] = useState(false);

    // Profile Completion State
    const [openProfileDialog, setOpenProfileDialog] = useState(false);
    const [driverName, setDriverName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser && !currentUser.displayName) {
                setOpenProfileDialog(true);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchProtests = async () => {
            if (!user) return;

            setLoadingProtests(true);
            try {
                // Handle Steam ID format (strip 'steam:' prefix if present)
                let uid = user.uid;
                if (uid.startsWith('steam:')) {
                    uid = uid.replace('steam:', '');
                }

                const q = query(
                    collection(db, 'protests'),
                    where('accuserId', '==', uid),
                    orderBy('createdAt', 'desc')
                );

                const querySnapshot = await getDocs(q);
                const protestsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Protest[];

                setProtests(protestsData);
            } catch (error) {
                console.error("Error fetching protests:", error);
            } finally {
                setLoadingProtests(false);
            }
        };

        if (user) {
            fetchProtests();
        } else {
            setProtests([]);
        }
    }, [user]);



    const handleSaveProfile = async () => {
        if (!user || !driverName.trim()) return;

        setSavingProfile(true);
        try {
            // Update Auth Profile
            await updateProfile(user, {
                displayName: driverName
            });

            // Update/Create Firestore User Document
            // Handle Steam ID format for doc ID
            let uid = user.uid;
            if (uid.startsWith('steam:')) {
                uid = uid.replace('steam:', '');
            }

            await setDoc(doc(db, 'users', uid), {
                name: driverName,
                updatedAt: new Date()
            }, { merge: true });

            // Force update local state
            setUser({ ...user, displayName: driverName });
            setOpenProfileDialog(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Erro ao salvar nome. Tente novamente.");
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    GAV Protestos
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Button variant="contained" size="large" onClick={() => navigate('/novo-protesto')} fullWidth>
                    Novo Protesto
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/admin')} fullWidth>
                    Painel Admin
                </Button>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Meus Protestos
            </Typography>

            {!user ? (
                <Alert severity="info">Faça login para ver seus protestos.</Alert>
            ) : loadingProtests ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : protests.length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                    Nenhum protesto encontrado.
                </Typography>
            ) : isMobile ? (
                <Box>
                    {protests?.map((protest) => (
                        <ProtestCard key={protest.id} protest={protest} />
                    ))}
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Acusado</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Veredito</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {protests?.map((protest) => (
                                <TableRow key={protest.id}>
                                    <TableCell>{formatDateOnly(protest.createdAt)}</TableCell>
                                    <TableCell>
                                        <UserName uid={protest.accusedId} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={translateStatus(protest?.status || '')}
                                            color={protest?.status === 'pending' ? 'warning' : protest?.status === 'under_review' ? 'info' : 'success'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {protest?.status === 'concluded' ? (
                                            <Chip
                                                label={protest?.verdict === 'punished' ? 'Punido' : protest?.verdict === 'absolved' ? 'Absolvido' : 'Inconclusivo'}
                                                color={protest?.verdict === 'punished' ? 'error' : protest?.verdict === 'absolved' ? 'success' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Profile Completion Dialog */}
            <Dialog open={openProfileDialog} onClose={() => { }}>
                <DialogTitle>Bem-vindo!</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Para continuar, por favor informe seu <strong>Nome de Piloto</strong> (ex: Nome Sobrenome).
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome de Piloto"
                        fullWidth
                        variant="outlined"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSaveProfile} variant="contained" disabled={!driverName.trim() || savingProfile}>
                        {savingProfile ? <CircularProgress size={24} /> : "Salvar e Continuar"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
