import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper,
    List, ListItem, ListItemText, Divider, Chip, CircularProgress, Avatar, ListItemButton, Button
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Protest } from '../types';
import UserName from '../components/UserName';
import { translateStatus } from '../utils/translations';
import { formatDateOnly } from '../utils/dateUtils';

export default function DriverProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        protestsInvolved: 0,
        penalties: 0,
        wins: 0 // Placeholder if we had race data linked to results
    });
    const [history, setHistory] = useState<Protest[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Clean ID - remove steam: prefix if present (protests are saved without it)
                const cleanId = id.startsWith('steam:') ? id.replace('steam:', '') : id;

                console.log('🔍 DriverProfile - Fetching protests for ID:', id, '→ Clean ID:', cleanId);

                // Fetch Protests where user is accused (NO orderBy to avoid index requirement)
                const qAccused = query(
                    collection(db, 'protests'),
                    where('accusedId', '==', cleanId)
                );
                const accusedSnap = await getDocs(qAccused);
                const accusedProtests = accusedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));
                console.log('📥 Found protests where user is ACCUSED:', accusedProtests.length, accusedProtests);

                // Fetch Protests where user is accuser (NO orderBy to avoid index requirement)
                const qAccuser = query(
                    collection(db, 'protests'),
                    where('accuserId', '==', cleanId)
                );
                const accuserSnap = await getDocs(qAccuser);
                const accuserProtests = accuserSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));
                console.log('📥 Found protests where user is ACCUSER:', accuserProtests.length, accuserProtests);

                // Combine and sort client-side (no index needed!)
                const allProtests = [...accusedProtests, ...accuserProtests].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                console.log('📊 Total combined protests:', allProtests.length);

                // Remove duplicates if any (shouldn't be, but good practice)
                const uniqueProtests = Array.from(new Map(allProtests.map(item => [item.id, item])).values());
                console.log('✅ Unique protests after deduplication:', uniqueProtests.length);

                setHistory(uniqueProtests);

                // Calculate Stats
                const penaltiesCount = accusedProtests.filter(p =>
                    p?.status === 'accepted' || (p?.status === 'concluded' && p?.verdict === 'Punido')
                ).length;

                console.log('\ud83d\udcca Stats calculation:', {
                    protestsInvolved: uniqueProtests.length,
                    penalties: penaltiesCount,
                    accusedProtestsCount: accusedProtests.length,
                    accuserProtestsCount: accuserProtests.length
                });

                setStats({
                    protestsInvolved: uniqueProtests.length,
                    penalties: penaltiesCount,
                    wins: 0
                });

            } catch (error) {
                console.error("❌ Error fetching driver data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    }

    if (!id) return <Typography>Motorista não encontrado.</Typography>;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
            {/* Header */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        <UserName uid={id} variant="h6" />
                    </Typography>
                </Avatar>
                <Box>
                    <Typography variant="h4">
                        <UserName uid={id} variant="h6" />
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">ID: {id}</Typography>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="primary">{stats.protestsInvolved}</Typography>
                        <Typography variant="body2" color="text.secondary">Protestos Envolvido</Typography>
                    </Paper>
                </Box>
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="error">{stats.penalties}</Typography>
                        <Typography variant="body2" color="text.secondary">Punições Recebidas</Typography>
                    </Paper>
                </Box>
            </Box>

            {/* History */}
            <Typography variant="h5" gutterBottom>Histórico de Protestos</Typography>
            {!history || history.length === 0 ? (
                <Typography color="text.secondary">Nenhum registro encontrado.</Typography>
            ) : (
                <Paper elevation={2}>
                    <List>
                        {history.map((protest, index) => (
                            <Box key={protest.id}>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate(`/admin/julgamento/${protest.id}`)}>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {protest.accuserId === id ? 'Autor' : 'Acusado'} em {protest.raceId}
                                                    </Typography>
                                                    <Chip
                                                        label={protest?.status === 'concluded' ? (protest?.verdict || 'Concluído') : translateStatus(protest?.status || '')}
                                                        color={protest?.status === 'concluded' && protest?.verdict === 'Punido' ? 'error' : 'default'}
                                                        size="small"
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="body2" color="text.primary">
                                                        Contra: <UserName uid={protest.accuserId === id ? protest.accusedId : protest.accuserId} />
                                                    </Typography>
                                                    <br />
                                                    {formatDateOnly(protest.createdAt)} - {protest?.description?.substring(0, 100) || 'Sem descrição'}...
                                                </>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {index < history.length - 1 && <Divider />}
                            </Box>
                        ))}
                    </List>
                </Paper>
            )}
            {/* Logout Button (Only for own profile) */}
            {auth.currentUser && (auth.currentUser.uid === id || id === 'me' || id === auth.currentUser.uid.replace('steam:', '')) && (
                <Box sx={{ mt: 6, mb: 4 }}>
                    <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        size="large"
                        startIcon={<LogoutIcon />}
                        onClick={async () => {
                            if (window.confirm("Deseja realmente sair?")) {
                                await signOut(auth);
                                navigate('/login');
                            }
                        }}
                        sx={{ fontWeight: 'bold', py: 1.5 }}
                    >
                        SAIR DO SISTEMA
                    </Button>
                </Box>
            )}
        </Container>
    );
}
