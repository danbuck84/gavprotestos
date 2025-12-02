import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Grid,
    List, ListItem, ListItemText, Divider, Chip, CircularProgress, Avatar, Stack
} from '@mui/material';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Protest } from '../types';
import UserName from '../components/UserName';

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
                // Fetch Protests where user is accused
                const qAccused = query(
                    collection(db, 'protests'),
                    where('accusedId', '==', id),
                    orderBy('createdAt', 'desc')
                );
                const accusedSnap = await getDocs(qAccused);
                const accusedProtests = accusedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));

                // Fetch Protests where user is accuser (optional, for history)
                const qAccuser = query(
                    collection(db, 'protests'),
                    where('accuserId', '==', id),
                    orderBy('createdAt', 'desc')
                );
                const accuserSnap = await getDocs(qAccuser);
                const accuserProtests = accuserSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));

                // Combine and sort
                const allProtests = [...accusedProtests, ...accuserProtests].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                // Remove duplicates if any (shouldn't be, but good practice)
                const uniqueProtests = Array.from(new Map(allProtests.map(item => [item.id, item])).values());

                setHistory(uniqueProtests);

                // Calculate Stats
                const penaltiesCount = accusedProtests.filter(p =>
                    p.status === 'accepted' || (p.status === 'concluded' && p.verdict === 'Punido')
                ).length;

                setStats({
                    protestsInvolved: uniqueProtests.length,
                    penalties: penaltiesCount,
                    wins: 0
                });

            } catch (error) {
                console.error("Error fetching driver data:", error);
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
            <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>&lt; Voltar</Button>

            {/* Header */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                    <UserName uid={id} variant="h4" onlyInitial />
                </Avatar>
                <Box>
                    <Typography variant="h4">
                        <UserName uid={id} variant="h4" />
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">ID: {id}</Typography>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="primary">{stats.protestsInvolved}</Typography>
                        <Typography variant="body2" color="text.secondary">Protestos Envolvido</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="error">{stats.penalties}</Typography>
                        <Typography variant="body2" color="text.secondary">Punições Recebidas</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* History */}
            <Typography variant="h5" gutterBottom>Histórico de Protestos</Typography>
            {history.length === 0 ? (
                <Typography color="text.secondary">Nenhum registro encontrado.</Typography>
            ) : (
                <Paper elevation={2}>
                    <List>
                        {history.map((protest, index) => (
                            <Box key={protest.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    button
                                    onClick={() => navigate(`/admin/julgamento/${protest.id}`)} // Or public view if exists
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {protest.accuserId === id ? 'Autor' : 'Acusado'} em {protest.raceId}
                                                </Typography>
                                                <Chip
                                                    label={protest.status === 'concluded' ? protest.verdict : protest.status}
                                                    color={protest.status === 'concluded' && protest.verdict === 'Punido' ? 'error' : 'default'}
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
                                                {new Date(protest.createdAt).toLocaleDateString()} - {protest.description.substring(0, 100)}...
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < history.length - 1 && <Divider />}
                            </Box>
                        ))}
                    </List>
                </Paper>
            )}
        </Container>
    );
}
