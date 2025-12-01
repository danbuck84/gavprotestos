import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Card, CardContent,
    List, ListItem, ListItemText, Divider, Chip, Button, CircularProgress, Avatar
} from '@mui/material';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Race, Protest } from '../types';

export default function DriverProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [driverName, setDriverName] = useState('Desconhecido');
    const [stats, setStats] = useState({
        races: 0,
        protestsReceived: 0,
        penalties: 0
    });
    const [history, setHistory] = useState<Protest[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                // 1. Get Driver Name (try Users collection first, then fallback to Races)
                // Note: 'id' here is the steamId (or uid) passed in URL
                let name = 'Piloto';

                // Check if there is a registered user with this ID
                const userDoc = await getDoc(doc(db, 'users', id));
                if (userDoc.exists()) {
                    name = userDoc.data().displayName || name;
                } else {
                    // Fallback: Look for name in recent races
                    // This is expensive if we query all races, but for now let's assume we might not find it easily without a dedicated drivers collection.
                    // We will rely on the name passed via navigation state if possible, or just show ID.
                    // Actually, let's try to find one race where he participated
                    // Optimization: We can't easily query inside the 'drivers' array of objects in Firestore without a specific structure.
                    // So we will stick with "Piloto (ID)" if not registered.
                }
                setDriverName(name);

                // 2. Get Races Count
                // We have to fetch all races and filter client-side because 'drivers' is an array of objects
                const racesSnapshot = await getDocs(collection(db, 'races'));
                let raceCount = 0;
                racesSnapshot.forEach(doc => {
                    const race = doc.data() as Race;
                    if (race.drivers.some(d => d.steamId === id)) {
                        raceCount++;
                    }
                });

                // 3. Get Protests (Involved as Accused or Accuser)
                // Firestore doesn't support logical OR in queries easily for different fields, so we run two queries.
                const qAccused = query(collection(db, 'protests'), where('accusedId', '==', id));
                const qAccuser = query(collection(db, 'protests'), where('accuserId', '==', id));

                const [accusedSnap, accuserSnap] = await Promise.all([getDocs(qAccused), getDocs(qAccuser)]);

                const accusedProtests = accusedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));
                const accuserProtests = accuserSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));

                // Merge and sort
                const allProtests = [...accusedProtests, ...accuserProtests].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                // Deduplicate if needed (unlikely unless self-protest which is blocked)
                const uniqueProtests = Array.from(new Map(allProtests.map(item => [item.id, item])).values());

                setHistory(uniqueProtests);

                // 4. Calculate Stats
                const penalties = accusedProtests.filter(p => p.status === 'accepted').length;

                setStats({
                    races: raceCount,
                    protestsReceived: accusedProtests.length,
                    penalties
                });

            } catch (error) {
                console.error("Error fetching driver profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'success';
            case 'rejected': return 'error';
            default: return 'warning';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Button onClick={() => navigate('/admin')} sx={{ mb: 2 }}>
                &lt; Voltar ao Painel
            </Button>

            <Paper elevation={3} sx={{ p: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                    {driverName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                    <Typography variant="h4">{driverName}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">ID: {id}</Typography>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>Corridas Disputadas</Typography>
                            <Typography variant="h3">{stats.races}</Typography>
                        </CardContent>
                    </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>Protestos Recebidos</Typography>
                            <Typography variant="h3">{stats.protestsReceived}</Typography>
                        </CardContent>
                    </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>Punições (Protestos Aceitos)</Typography>
                            <Typography variant="h3" color="error">{stats.penalties}</Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            <Typography variant="h5" gutterBottom>Histórico de Protestos</Typography>
            <Paper elevation={2}>
                <List>
                    {history.length === 0 ? (
                        <ListItem><ListItemText primary="Nenhum histórico encontrado." /></ListItem>
                    ) : (
                        history.map((protest, index) => (
                            <div key={protest.id}>
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1">
                                                    {protest.accuserId === id ?
                                                        <span style={{ color: '#4caf50' }}>Autor</span> :
                                                        <span style={{ color: '#f44336' }}>Réu</span>
                                                    }
                                                    {' - '}
                                                    {protest.incidentType}
                                                </Typography>
                                                <Chip
                                                    label={protest.status.toUpperCase()}
                                                    color={getStatusColor(protest.status) as any}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.primary">
                                                    Contra: {protest.accuserId === id ? protest.accusedId : protest.accuserId}
                                                </Typography>
                                                <br />
                                                {new Date(protest.createdAt).toLocaleDateString()} - {protest.description.substring(0, 100)}...
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < history.length - 1 && <Divider />}
                            </div>
                        ))
                    )}
                </List>
            </Paper>
        </Container>
    );
}
