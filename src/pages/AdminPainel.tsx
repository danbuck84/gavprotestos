
import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Alert, CircularProgress, List, ListItem, ListItemText, IconButton, Divider, Paper, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { parseRaceJson } from '../services/raceParser';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Race, Protest } from '../types';
import NotificationBell from '../components/NotificationBell';

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
                        text: `Erro: A corrida "${raceData.trackName}" de ${new Date(raceData.date).toLocaleString()} já foi importada.`
                    });
                    return;
                }

                // Save to Firestore
                const docRef = await addDoc(collection(db, 'races'), raceData);

                setMessage({
                    type: 'success',
                    text: `Corrida "${raceData.trackName}" importada com sucesso! ID: ${docRef.id} com ${raceData.drivers.length} pilotos.`
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
                                            secondary={`${new Date(race.date).toLocaleString()} - ${race.drivers.length} pilotos`}
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
                <Typography variant="h5" gutterBottom>Todos os Protestos</Typography>
                {protests.length === 0 ? (
                    <Typography color="text.secondary">Nenhum protesto registrado.</Typography>
                ) : (
                    <Paper elevation={2}>
                        <List>
                            {protests.map((protest, index) => (
                                <div key={protest.id}>
                                    <ListItem alignItems="flex-start">
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        <span
                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => navigate(`/ admin / piloto / ${protest.accuserId} `)}
                                                        >
                                                            {protest.accuserId}
                                                        </span>
                                                        {' vs '}
                                                        <span
                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => navigate(`/ admin / piloto / ${protest.accusedId} `)}
                                                        >
                                                            {protest.accusedId}
                                                        </span>
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            color="primary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/ admin / julgamento / ${protest.id} `);
                                                            }}
                                                        >
                                                            Julgar
                                                        </Button>
                                                        <Chip
                                                            label={protest.status.toUpperCase().replace('_', ' ')}
                                                            color={
                                                                protest.status === 'concluded' ? 'success' :
                                                                    protest.status === 'under_review' ? 'warning' :
                                                                        protest.status === 'inconclusive' ? 'default' : 'info'
                                                            }
                                                            size="small"
                                                        />
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="body2" color="text.primary" display="block">
                                                        {protest.incidentType} - Volta {protest.lap} - {new Date(protest.createdAt).toLocaleDateString()}
                                                    </Typography>
                                                    {protest.description}
                                                    <br />
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                                        {protest.videoUrls && protest.videoUrls.length > 0 ? (
                                                            protest.videoUrls.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                                    Vídeo {i + 1}
                                                                </a>
                                                            ))
                                                        ) : (
                                                            // Fallback for old protests
                                                            (protest as any).videoUrl && (
                                                                <a href={(protest as any).videoUrl} target="_blank" rel="noopener noreferrer">
                                                                    Ver Vídeo
                                                                </a>
                                                            )
                                                        )}
                                                    </Box>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {index < protests.length - 1 && <Divider />}
                                </div>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>
        </Container>
    );
}
