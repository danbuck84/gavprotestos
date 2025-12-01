import { useState, useEffect } from 'react';
import {
    Container, Typography, TextField, Button, MenuItem,
    Select, FormControl, InputLabel, Box, CircularProgress, Snackbar, Alert, LinearProgress
} from '@mui/material';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import type { Race, RaceDriver } from '../types';
import { useNavigate } from 'react-router-dom';

export default function NovoProtesto() {
    const navigate = useNavigate();
    const [races, setRaces] = useState<Race[]>([]);
    const [selectedRaceId, setSelectedRaceId] = useState('');
    const [drivers, setDrivers] = useState<RaceDriver[]>([]);

    const [accusedId, setAccusedId] = useState('');
    const [lap, setLap] = useState('');
    const [videoMinute, setVideoMinute] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [incidentType, setIncidentType] = useState('');
    const [description, setDescription] = useState('');

    // Video Upload State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        const fetchRaces = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'races'));
                const racesData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { ...data, id: doc.id } as Race;
                });
                setRaces(racesData);
            } catch (error) {
                console.error("Error fetching races", error);
                setSnackbar({ open: true, message: "Erro ao carregar corridas.", severity: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchRaces();
    }, []);

    useEffect(() => {
        if (selectedRaceId) {
            const race = races.find(r => r.id === selectedRaceId);
            if (race) {
                setDrivers(race.drivers);
            }
        } else {
            setDrivers([]);
        }
    }, [selectedRaceId, races]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            setSnackbar({ open: true, message: "Você precisa estar logado.", severity: 'error' });
            return;
        }

        // Validation: Self protest
        let currentUserSteamId = auth.currentUser.uid;
        if (currentUserSteamId.startsWith('steam:')) {
            currentUserSteamId = currentUserSteamId.replace('steam:', '');
        } else {
            // Dev/Test login might not have 'steam:' prefix
            console.warn("User ID does not start with 'steam:'. Using raw UID:", currentUserSteamId);
        }

        if (accusedId === currentUserSteamId) {
            setSnackbar({ open: true, message: "Você não pode protestar contra si mesmo.", severity: 'warning' });
            return;
        }

        if (!videoUrl && !videoFile) {
            setSnackbar({ open: true, message: "Por favor, forneça um link de vídeo ou faça upload de um arquivo.", severity: 'warning' });
            return;
        }

        setSubmitting(true);

        try {
            let finalVideoUrl = videoUrl;

            // Handle Video Upload
            if (videoFile) {
                const storageRef = ref(storage, `protests/${currentUserSteamId}/${Date.now()}_${videoFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, videoFile);

                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => {
                            console.error("Upload error:", error);
                            reject(error);
                        },
                        async () => {
                            finalVideoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve();
                        }
                    );
                });
            }

            await addDoc(collection(db, 'protests'), {
                raceId: selectedRaceId,
                accuserId: currentUserSteamId,
                accusedId,
                lap: Number(lap),
                videoMinute,
                videoUrl: finalVideoUrl,
                incidentType,
                description,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSnackbar({ open: true, message: "Protesto enviado com sucesso!", severity: 'success' });
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            console.error("Error sending protest", error);
            setSnackbar({ open: true, message: "Erro ao enviar protesto.", severity: 'error' });
            setSubmitting(false);
            setUploadProgress(0);
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
            <Button onClick={() => navigate('/')} sx={{ mb: 2 }}>
                &lt; Voltar
            </Button>
            <Typography variant="h4" gutterBottom>Novo Protesto</Typography>
            <form onSubmit={handleSubmit}>
                <FormControl fullWidth margin="normal">
                    <InputLabel>Etapa / Corrida</InputLabel>
                    <Select
                        value={selectedRaceId}
                        label="Etapa / Corrida"
                        onChange={(e) => setSelectedRaceId(e.target.value)}
                        required
                    >
                        {races.map((race) => (
                            <MenuItem key={race.id} value={race.id}>
                                {race.trackName} - {new Date(race.date).toLocaleDateString()}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth margin="normal" disabled={!selectedRaceId}>
                    <InputLabel>Piloto Acusado</InputLabel>
                    <Select
                        value={accusedId}
                        label="Piloto Acusado"
                        onChange={(e) => setAccusedId(e.target.value)}
                        required
                    >
                        {drivers.map((driver) => (
                            <MenuItem key={driver.steamId} value={driver.steamId}>
                                {driver.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Volta"
                        type="number"
                        value={lap}
                        onChange={(e) => setLap(e.target.value)}
                        required
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Minuto do Vídeo"
                        placeholder="ex: 12:30"
                        value={videoMinute}
                        onChange={(e) => setVideoMinute(e.target.value)}
                        required
                        fullWidth
                        margin="normal"
                    />
                </Box>

                <Box sx={{ mt: 2, mb: 1, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>Evidência em Vídeo</Typography>

                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        {videoFile ? `Arquivo selecionado: ${videoFile.name}` : "Fazer Upload de Vídeo"}
                        <input
                            type="file"
                            hidden
                            accept="video/*,.mkv,.mp4,.avi,.wmv,.mov,.webm"
                            onChange={handleFileChange}
                        />
                    </Button>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <Box sx={{ width: '100%', mb: 2 }}>
                            <LinearProgress variant="determinate" value={uploadProgress} />
                            <Typography variant="caption" color="text.secondary">{Math.round(uploadProgress)}% enviado</Typography>
                        </Box>
                    )}

                    <Typography variant="body2" align="center" sx={{ mb: 2 }}>OU</Typography>

                    <TextField
                        label="Link do Vídeo (YouTube/Twitch)"
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        fullWidth
                        helperText="Se preferir, cole o link do vídeo hospedado externamente."
                    />
                </Box>

                <FormControl fullWidth margin="normal">
                    <InputLabel>Tipo de Incidente</InputLabel>
                    <Select
                        value={incidentType}
                        label="Tipo de Incidente"
                        onChange={(e) => setIncidentType(e.target.value)}
                        required
                    >
                        <MenuItem value="Colisão">Colisão</MenuItem>
                        <MenuItem value="Bloqueio">Bloqueio</MenuItem>
                        <MenuItem value="Retorno Inseguro">Retorno Inseguro</MenuItem>
                        <MenuItem value="Outro">Outro</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label="Descrição do Incidente"
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                />

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ mt: 3 }}
                    disabled={submitting}
                >
                    {submitting ? <CircularProgress size={24} /> : "Enviar Protesto"}
                </Button>
            </form>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
