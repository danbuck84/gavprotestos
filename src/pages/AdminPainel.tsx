import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Alert, CircularProgress, Paper, Chip, List, ListItem, ListItemText, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { parseRaceJson } from '../services/raceParser';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, orderBy, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Race, Protest } from '../types';
import NotificationBell from '../components/NotificationBell';
import { formatDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function AdminPainel() {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [races, setRaces] = useState<Race[]>([]);
    const [protests, setProtests] = useState<Protest[]>([]);

    useEffect(() => {
        const unsubscribeRaces = onSnapshot(collection(db, 'races'), (snapshot) => {
            const racesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return { ...data, id: doc.id } as Race;
            });
            setRaces(racesData);
        });

        const qProtests = query(collection(db, 'protests'), orderBy('createdAt', 'desc'));
        const unsubscribeProtests = onSnapshot(qProtests, (snapshot) => {
            const protestsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Protest[];
            setProtests(protestsData);
        });

        return () => {
            unsubscribeRaces();
            unsubscribeProtests();
        };
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target?.result as string);
                const raceData = parseRaceJson(jsonContent);

                // Check for duplicates
                const q = query(
                    collection(db, 'races'),
                    where('trackName', '==', raceData.trackName),
                    where('date', '==', raceData.date)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    setMessage({
                        type: 'error',
                        text: `Erro: A corrida "${raceData.trackName}" de ${formatDate(raceData.date)} já foi importada.`
                    });
                    return;
                }

                // Save race to Firestore
                const docRef = await addDoc(collection(db, 'races'), raceData);

                // UPSERT: Update or Insert drivers to prevent duplicates
                let driversUpdated = 0;
                let driversCreated = 0;

                for (const driver of raceData.drivers) {
                    if (!driver.steamId) continue;

                    // Use steamId as Document ID to ensure physical uniqueness
                    const userDocRef = doc(db, 'users', driver.steamId);
                    const userSnapshot = await getDoc(userDocRef);

                    if (userSnapshot.exists()) {
                        // User exists - update displayName only
                        await updateDoc(userDocRef, {
                            displayName: driver.name
                        });
                        driversUpdated++;
                    } else {
                        // User does not exist - create new with steamId as Document ID
                        await setDoc(userDocRef, {
                            steamId64: driver.steamId,
                            displayName: driver.name,
                            role: 'driver',
                            createdAt: serverTimestamp()
                        });
                        driversCreated++;
                    }
                }

                setMessage({
                    type: 'success',
                    text: `Corrida "${raceData.trackName}" importada com sucesso! ID: ${docRef.id} com ${raceData.drivers.length} pilotos (${driversCreated} novos, ${driversUpdated} atualizados).`
                });
            } catch (error) {
                console.error("Erro ao importar:", error);
                setMessage({ type: 'error', text: "Erro ao processar o arquivo. Verifique se é um JSON válido do Assetto Corsa." });
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteRace = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta corrida?')) {
            try {
                await deleteDoc(doc(db, 'races', id));
                setMessage({ type: 'success', text: 'Corrida excluída com sucesso.' });
            } catch (error) {
                console.error("Erro ao excluir:", error);
                setMessage({ type: 'error', text: 'Erro ao excluir corrida.' });
            }
        }
    };



    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button onClick={() => navigate('/')}>
                    &lt; Voltar
                </Button>
                <NotificationBell />
            </Box>
            <Typography variant="h4" gutterBottom>Painel Administrativo</Typography>
            <Typography variant="body1" paragraph>Área restrita para comissários.</Typography>

            <Box sx={{ mb: 4 }}>
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/admin/usuarios')}
                >
                    Gerenciar Usuários
                </Button>
            </Box>

            <Box sx={{ mt: 4, p: 3, border: '1px dashed grey', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Importar Resultado de Corrida</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Selecione o arquivo JSON de resultados do Assetto Corsa para cadastrar uma nova etapa.
                </Typography>

                <Button
                    variant="contained"
                    component="label"
                    disabled={uploading}
                >
                    {uploading ? <CircularProgress size={24} /> : "Selecionar Arquivo JSON"}
                    <input
                        type="file"
                        hidden
                        accept=".json"
                        onChange={handleFileUpload}
                    />
                </Button>

                {message && (
                    <Alert severity={message.type} sx={{ mt: 2 }}>
                        {message.text}
                    </Alert>
                )}
            </Box>

            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom>Corridas Cadastradas</Typography>
                {races.length === 0 ? (
                    <Typography color="text.secondary">Nenhuma corrida cadastrada.</Typography>
                ) : (
                    <Paper elevation={2}>
                        <List>
                            {races.map((race, index) => (
                                <div key={race.id}>
                                    <ListItem
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteRace(race.id!)} color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={race.trackName}
                                            secondary={`${formatDate(race.date)} - ${race.drivers.length} pilotos`}
                                        />
                                    </ListItem>
                                    {index < races.length - 1 && <Divider />}
                                </div>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom>Corridas Recentes</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Clique em uma corrida para ver os protestos dessa etapa.
                </Typography>
                {races.length === 0 ? (
                    <Typography color="text.secondary">Nenhuma corrida cadastrada.</Typography>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {races
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((race) => {
                                const raceProtests = protests.filter(p => p.raceId === race.id);
                                const pendingCount = raceProtests.filter(p => p.status === 'pending').length;
                                const reviewCount = raceProtests.filter(p => p.status === 'under_review').length;
                                const concludedCount = raceProtests.filter(p => p.status === 'concluded').length;
                                const totalCount = raceProtests.length;

                                return (
                                    <Paper
                                        key={race.id}
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                elevation: 6,
                                                transform: 'translateY(-2px)',
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                        onClick={() => navigate(`/admin/corrida/${race.id}`)}
                                    >
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            {race.trackName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {formatDate(race.date)}
                                        </Typography>

                                        {totalCount > 0 ? (
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                                {pendingCount > 0 && (
                                                    <Chip
                                                        label={`${pendingCount} Pendente${pendingCount > 1 ? 's' : ''}`}
                                                        color="warning"
                                                        size="small"
                                                        variant="filled"
                                                    />
                                                )}
                                                {reviewCount > 0 && (
                                                    <Chip
                                                        label={`${reviewCount} Em Análise`}
                                                        color="info"
                                                        size="small"
                                                        variant="filled"
                                                    />
                                                )}
                                                {concludedCount > 0 && (
                                                    <Chip
                                                        label={`${concludedCount} Concluído${concludedCount > 1 ? 's' : ''}`}
                                                        color="success"
                                                        size="small"
                                                        variant="filled"
                                                    />
                                                )}
                                            </Box>
                                        ) : (
                                            <Chip
                                                label="Sem protestos"
                                                color="default"
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}

                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            {race.drivers.length} pilotos • {totalCount} protesto{totalCount !== 1 ? 's' : ''}
                                        </Typography>
                                    </Paper>
                                );
                            })}
                    </Box>
                )}
            </Box>
        </Container>
    );
}
