import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Chip, CircularProgress, Stack
} from '@mui/material';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Protest, Race } from '../types';
import ProtestCard from '../components/ProtestCard';

export default function AdminRaceDetail() {
    const { raceId } = useParams<{ raceId: string }>();
    const [race, setRace] = useState<Race | null>(null);
    const [protests, setProtests] = useState<Protest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'concluded'>('all');

    useEffect(() => {
        const fetchData = async () => {
            if (!raceId) return;
            setLoading(true);
            try {
                // Fetch race details
                const raceDoc = await getDoc(doc(db, 'races', raceId));
                if (raceDoc.exists()) {
                    setRace({ id: raceDoc.id, ...raceDoc.data() } as Race);
                }

                // Fetch protests for this race
                const q = query(
                    collection(db, 'protests'),
                    where('raceId', '==', raceId)
                );
                const snapshot = await getDocs(q);
                const protestsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Protest[];

                // Sort by creation date with safety checks
                protestsData.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });

                setProtests(protestsData);
            } catch (error) {
                console.error("Error fetching race details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [raceId]);

    const getFilteredProtests = () => {
        if (!protests || protests.length === 0) return [];
        if (filter === 'all') return protests;
        return protests.filter(p => p?.status === filter);
    };

    const filteredProtests = getFilteredProtests();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!race) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h6">Corrida não encontrada</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            {/* Race Header */}
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="overline" color="text.secondary">Corrida</Typography>
                <Typography variant="h4" gutterBottom fontWeight="bold">{race.trackName}</Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    {race.date ? new Date(race.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Data não disponível'}
                </Typography>
                {/* Heats feature commented out - Race type doesn't include heats property */}
                {/* {race.heats?.map((heat: string, index: number) => (
                    <Chip key={index} label={heat} size="small" />
                ))} */}
            </Paper>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Chip
                    label={`Todos (${protests?.length || 0})`}
                    onClick={() => setFilter('all')}
                    color={filter === 'all' ? 'primary' : 'default'}
                    variant={filter === 'all' ? 'filled' : 'outlined'}
                />
                <Chip
                    label={`Pendentes (${protests?.filter(p => p.status === 'pending').length || 0})`}
                    onClick={() => setFilter('pending')}
                    color={filter === 'pending' ? 'warning' : 'default'}
                    variant={filter === 'pending' ? 'filled' : 'outlined'}
                />
                <Chip
                    label={`Em Votação (${protests?.filter(p => p.status === 'under_review').length || 0})`}
                    onClick={() => setFilter('under_review')}
                    color={filter === 'under_review' ? 'info' : 'default'}
                    variant={filter === 'under_review' ? 'filled' : 'outlined'}
                />
                <Chip
                    label={`Concluídos (${protests?.filter(p => p.status === 'concluded').length || 0})`}
                    onClick={() => setFilter('concluded')}
                    color={filter === 'concluded' ? 'success' : 'default'}
                    variant={filter === 'concluded' ? 'filled' : 'outlined'}
                />
            </Box>

            {/* Protests List */}
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Protestos desta Corrida
            </Typography>

            {filteredProtests.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                        {filter === 'all'
                            ? 'Nenhum protesto registrado para esta corrida.'
                            : 'Nenhum protesto neste filtro.'}
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={2}>
                    {filteredProtests?.map(protest => (
                        <ProtestCard key={protest?.id || Math.random()} protest={protest} />
                    ))}
                </Stack>
            )}
        </Container>
    );
}
