import { useState, useEffect } from 'react';
import {
    Container, Typography, TextField, Button, MenuItem,
    Select, FormControl, InputLabel, Box, CircularProgress, Snackbar, Alert, LinearProgress, Chip, Stack
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
    const [heat, setHeat] = useState<'Bateria 1' | 'Bateria 2' | 'Bateria Única'>('Bateria 1');
    const [positionsLost, setPositionsLost] = useState('');
    const [incidentType, setIncidentType] = useState('');
    const [description, setDescription] = useState('');

    // Video Upload State
    const [videoFiles, setVideoFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDeadlineExpired, setIsDeadlineExpired] = useState(false);

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
                // Sort by date desc
                racesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

                // Check 24h Deadline
                const raceDate = new Date(race.date).getTime();
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;

                if (now > raceDate + twentyFourHours) {
                    setIsDeadlineExpired(true);
                    setSnackbar({
                        open: true,
                        message: "O prazo de 24h para protestos desta corrida já encerrou.",
                        severity: 'error'
                    });
                } else {
                    setIsDeadlineExpired(false);
                }
            }
        } else {
            setDrivers([]);
            setIsDeadlineExpired(false);
        }
    }, [selectedRaceId, races]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (files.length + videoFiles.length > 3) {
                setSnackbar({ open: true, message: "Máximo de 3 vídeos permitidos.", severity: 'warning' });
                return;
            }
            setVideoFiles(prev => [...prev, ...files].slice(0, 3));
        }
    };

    const removeFile = (index: number) => {
        setVideoFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            setSnackbar({ open: true, message: "Você precisa estar logado.", severity: 'error' });
            return;
        }

        if (isDeadlineExpired) {
            setSnackbar({ open: true, message: "Prazo de protesto encerrado.", severity: 'error' });
            return;
        }

        let currentUserSteamId = auth.currentUser.uid;
        if (currentUserSteamId.startsWith('steam:')) {
            currentUserSteamId = currentUserSteamId.replace('steam:', '');
        }

        if (accusedId === currentUserSteamId) {
            setSnackbar({ open: true, message: "Você não pode protestar contra si mesmo.", severity: 'warning' });
            return;
        }

        if (videoFiles.length === 0) {
            setSnackbar({ open: true, message: "Pelo menos 1 vídeo é obrigatório.", severity: 'warning' });
            return;
        }

        setSubmitting(true);

        try {
            const uploadedUrls: string[] = [];

            // Upload Videos Sequentially
            for (let i = 0; i < videoFiles.length; i++) {
                const file = videoFiles[i];
                const storageRef = ref(storage, `protests/${currentUserSteamId}/${Date.now()}_${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            // Calculate total progress roughly
                            const currentFileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            const totalProgress = ((i * 100) + currentFileProgress) / videoFiles.length;
                            setUploadProgress(totalProgress);
                        },
                        (error) => {
                            console.error("Upload error:", error);
                            reject(error);
                        },
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            uploadedUrls.push(url);
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
                heat,
                positionsLost: Number(positionsLost),
                videoUrls: uploadedUrls,
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

            {isDeadlineExpired && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    O prazo de 24 horas para protestos desta corrida já encerrou.
                </Alert>
            )}

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
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Bateria</InputLabel>
                        <Select
                            value={heat}
                            label="Bateria"
                            onChange={(e) => setHeat(e.target.value as any)}
                            required
                        >
                            <MenuItem value="Bateria 1">Bateria 1</MenuItem>
                            <MenuItem value="Bateria 2">Bateria 2</MenuItem>
                            <MenuItem value="Bateria Única">Bateria Única</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Volta"
                        type="number"
                        value={lap}
                        onChange={(e) => setLap(e.target.value)}
                        required
                        fullWidth
                        margin="normal"
                    />
                </Box>

                <TextField
                    label="Posições Perdidas"
                    type="number"
                    value={positionsLost}
                    onChange={(e) => setPositionsLost(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    helperText="Quantas posições você perdeu devido ao incidente?"
                />

                <Box sx={{ mt: 2, mb: 1, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>Evidência em Vídeo (Obrigatório)</Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                        Envie até 3 vídeos. Formatos aceitos: MP4, MKV, AVI, WMV.
                    </Typography>

                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ mb: 2 }}
                        disabled={videoFiles.length >= 3}
                    >
                        Selecionar Vídeos
                        <input
                            type="file"
                            hidden
                            multiple
                            accept="video/*,.mkv,.mp4,.avi,.wmv,.mov,.webm"
                            onChange={handleFileChange}
                        />
                    </Button>

                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        {videoFiles.map((file, index) => (
                            <Chip
                                key={index}
                                label={file.name}
                                onDelete={() => removeFile(index)}
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                    </Stack>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <Box sx={{ width: '100%', mb: 2 }}>
                            <LinearProgress variant="determinate" value={uploadProgress} />
                            <Typography variant="caption" color="text.secondary">{Math.round(uploadProgress)}% enviado</Typography>
                        </Box>
                    )}
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
                    disabled={submitting || isDeadlineExpired}
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
