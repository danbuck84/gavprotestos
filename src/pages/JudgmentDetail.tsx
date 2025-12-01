import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Button, TextField,
    FormControl, RadioGroup, FormControlLabel, Radio,
    CircularProgress, Chip, List, ListItem, ListItemText, Alert, Snackbar,
    Stack, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GavelIcon from '@mui/icons-material/Gavel';
import { doc, collection, addDoc, onSnapshot, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import type { Protest, Vote, ProtestStatus, Race } from '../types';
import { isSuperAdmin } from '../utils/permissions';

export default function JudgmentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [protest, setProtest] = useState<Protest | null>(null);
    const [race, setRace] = useState<Race | null>(null);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);

    // Lifecycle State
    const [lifecyclePhase, setLifecyclePhase] = useState<'submission' | 'voting' | 'concluded'>('submission');
    const [timeRemaining, setTimeRemaining] = useState('');

    // Vote Form State
    const [verdict, setVerdict] = useState<'punish' | 'acquit'>('punish');
    const [reason, setReason] = useState('');
    const [hasVoted, setHasVoted] = useState(false);
    const [showVoteForm, setShowVoteForm] = useState(false);

    // Super Admin State
    const [isSuper, setIsSuper] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editForm, setEditForm] = useState({
        description: '',
        videoUrls: '',
        incidentType: '',
        heat: ''
    });

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    useEffect(() => {
        if (!id) return;

        const unsubscribeProtest = onSnapshot(doc(db, 'protests', id), async (docSnap) => {
            if (docSnap.exists()) {
                const protestData = { id: docSnap.id, ...docSnap.data() } as Protest;
                setProtest(protestData);

                // Initialize edit form
                setEditForm({
                    description: protestData.description,
                    videoUrls: protestData.videoUrls ? protestData.videoUrls.join('\n') : '',
                    incidentType: protestData.incidentType,
                    heat: protestData.heat
                });

                if (protestData.raceId) {
                    const raceDoc = await getDoc(doc(db, 'races', protestData.raceId));
                    if (raceDoc.exists()) {
                        setRace({ id: raceDoc.id, ...raceDoc.data() } as Race);
                    }
                }
            } else {
                navigate('/admin');
            }
            setLoading(false);
        });

        const qVotes = collection(db, 'protests', id, 'votes');
        const unsubscribeVotes = onSnapshot(qVotes, (snapshot) => {
            const votesData = snapshot.docs.map(doc => doc.data() as Vote);
            setVotes(votesData);

            if (auth.currentUser) {
                const myVote = votesData.find(v => v.adminId === auth.currentUser?.uid);
                setHasVoted(!!myVote);
                setIsSuper(isSuperAdmin(auth.currentUser.uid));
            }
        });

        return () => {
            unsubscribeProtest();
            unsubscribeVotes();
        };
    }, [id, navigate]);

    useEffect(() => {
        if (!race || !protest) return;

        const checkLifecycle = async () => {
            const raceDate = new Date(race.date).getTime();
            const now = Date.now();
            const hoursSinceRace = (now - raceDate) / (1000 * 60 * 60);

            if (hoursSinceRace < 24) {
                setLifecyclePhase('submission');
                const hoursLeft = 24 - hoursSinceRace;
                setTimeRemaining(`${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m para abrir votação`);
            } else if (hoursSinceRace < 48) {
                setLifecyclePhase('voting');
                const hoursLeft = 48 - hoursSinceRace;
                setTimeRemaining(`${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m para encerrar votação`);

                if (protest.status === 'pending') {
                    await updateDoc(doc(db, 'protests', protest.id), { status: 'under_review' });
                }
            } else {
                setLifecyclePhase('concluded');
                setTimeRemaining('Votação Encerrada');

                if (protest.status !== 'concluded' && protest.status !== 'inconclusive') {
                    calculateAndSaveVerdict();
                }
            }
        };

        checkLifecycle();
        const interval = setInterval(checkLifecycle, 60000);
        return () => clearInterval(interval);
    }, [race, protest, votes]);

    const calculateAndSaveVerdict = async () => {
        if (!protest || !votes) return;

        const punishVotes = votes.filter(v => v.verdict === 'punish').length;
        const acquitVotes = votes.filter(v => v.verdict === 'acquit').length;

        let finalStatus: ProtestStatus = 'concluded';
        let finalVerdict = '';

        if (votes.length === 0) {
            finalStatus = 'inconclusive';
            finalVerdict = 'Inconclusivo (Sem Votos)';
        } else if (punishVotes > acquitVotes) {
            finalVerdict = 'Punido';
        } else if (acquitVotes > punishVotes) {
            finalVerdict = 'Absolvido';
        } else {
            finalStatus = 'inconclusive';
            finalVerdict = 'Inconclusivo (Empate)';
        }

        try {
            await updateDoc(doc(db, 'protests', protest.id), {
                status: finalStatus,
                verdict: finalVerdict,
                voteCount: { punish: punishVotes, acquit: acquitVotes }
            });
        } catch (error) {
            console.error("Error auto-concluding:", error);
        }
    };

    const handleSubmitVote = async () => {
        if (!protest || !auth.currentUser || !reason.trim()) return;

        setVoting(true);
        try {
            const voteData: Vote = {
                adminId: auth.currentUser.uid,
                adminName: auth.currentUser.displayName || 'Admin',
                verdict,
                reason,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'protests', protest.id, 'votes'), voteData);
            setSnackbar({ open: true, message: 'Voto registrado com sucesso!', severity: 'success' });
            setReason('');
            setShowVoteForm(false);
        } catch (error) {
            console.error("Error submitting vote:", error);
            setSnackbar({ open: true, message: 'Erro ao registrar voto.', severity: 'error' });
        } finally {
            setVoting(false);
        }
    };

    // Super Admin Actions
    const handleForceStatus = async (newStatus: ProtestStatus) => {
        if (!protest) return;
        try {
            await updateDoc(doc(db, 'protests', protest.id), { status: newStatus });
            setSnackbar({ open: true, message: `Status alterado para ${newStatus}`, severity: 'success' });
        } catch (error) {
            console.error("Error forcing status:", error);
            setSnackbar({ open: true, message: 'Erro ao alterar status.', severity: 'error' });
        }
    };

    const handleSaveEdit = async () => {
        if (!protest) return;
        try {
            const videoUrlsArray = editForm.videoUrls.split('\n').filter(url => url.trim() !== '');
            await updateDoc(doc(db, 'protests', protest.id), {
                description: editForm.description,
                videoUrls: videoUrlsArray,
                incidentType: editForm.incidentType as any,
                heat: editForm.heat as any
            });
            setOpenEditDialog(false);
            setSnackbar({ open: true, message: 'Protesto atualizado com sucesso!', severity: 'success' });
        } catch (error) {
            console.error("Error updating protest:", error);
            setSnackbar({ open: true, message: 'Erro ao atualizar protesto.', severity: 'error' });
        }
    };

    const handleDeleteProtest = async () => {
        if (!protest || !window.confirm("TEM CERTEZA? Isso apagará o protesto e os vídeos permanentemente.")) return;

        try {
            // Try to delete videos if they are stored in Firebase Storage
            if (protest.videoUrls) {
                for (const url of protest.videoUrls) {
                    if (url.includes('firebasestorage')) {
                        try {
                            const videoRef = ref(storage, url);
                            await deleteObject(videoRef);
                        } catch (e) {
                            console.warn("Could not delete video:", url, e);
                        }
                    }
                }
            }

            await deleteDoc(doc(db, 'protests', protest.id));
            navigate('/admin');
        } catch (error) {
            console.error("Error deleting protest:", error);
            setSnackbar({ open: true, message: 'Erro ao excluir protesto.', severity: 'error' });
        }
    };

    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('youtu.be')) {
                videoId = url.split('/').pop() || '';
            } else {
                const urlParams = new URLSearchParams(new URL(url).search);
                videoId = urlParams.get('v') || '';
            }
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    };

    const isVideoFile = (url: string) => {
        return !url.includes('youtube') && !url.includes('youtu.be');
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    }

    if (!protest) return null;

    return (
        <Container maxWidth="md" sx={{ mt: 2, mb: 12 }}>
            <Stack spacing={3}>
                {/* Timer Section */}
                {timeRemaining && (
                    <Alert
                        icon={<AccessTimeIcon fontSize="inherit" />}
                        severity={timeRemaining.includes('encerrar') && !timeRemaining.includes('Votação Encerrada') ? 'warning' : 'info'}
                        variant="filled"
                        sx={{ width: '100%', fontWeight: 'bold', justifyContent: 'center' }}
                    >
                        {timeRemaining}
                    </Alert>
                )}

                {/* Super Admin Actions */}
                {isSuper && (
                    <Paper elevation={0} sx={{ p: 2, border: '1px dashed #f44336', bgcolor: 'rgba(244, 67, 54, 0.05)' }}>
                        <Typography variant="subtitle2" color="error" fontWeight="bold" gutterBottom>
                            SUPER ADMIN ZONE
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => setOpenEditDialog(true)}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                startIcon={<GavelIcon />}
                                onClick={() => handleForceStatus('concluded')}
                            >
                                Forçar Conclusão
                            </Button>
                            <Button
                                variant="outlined"
                                color="info"
                                size="small"
                                onClick={() => handleForceStatus('pending')}
                            >
                                Forçar Pendente
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<DeleteIcon />}
                                onClick={handleDeleteProtest}
                            >
                                EXCLUIR
                            </Button>
                        </Box>
                    </Paper>
                )}

                {/* Header Section */}
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="overline" color="text.secondary">Protesto</Typography>
                            <Typography variant="h6" fontWeight="bold">
                                {protest.accuserId} <Typography component="span" color="text.secondary">vs</Typography> {protest.accusedId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {race?.trackName} - {protest.heat}
                            </Typography>
                        </Box>
                        <Chip
                            label={protest.status === 'concluded' ? protest.verdict : protest.status.replace('_', ' ').toUpperCase()}
                            color={protest.status === 'concluded' ? (protest.verdict === 'Punido' ? 'error' : 'success') : 'warning'}
                            size="small"
                        />
                    </Box>
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="bold">Incidente:</Typography>
                        <Typography variant="body2">{protest.incidentType} (Volta {protest.lap})</Typography>
                    </Box>
                </Paper>

                {/* Description Section */}
                <Paper elevation={0} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Descrição do Ocorrido</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {protest.description}
                    </Typography>
                </Paper>

                {/* Video Evidence Section */}
                <Paper elevation={0} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Provas de Vídeo</Typography>
                    <Stack spacing={2}>
                        {protest.videoUrls && protest.videoUrls.length > 0 ? (
                            protest.videoUrls.map((url, i) => (
                                <Box key={i} sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                                    {isVideoFile(url) ? (
                                        <video controls width="100%" style={{ maxHeight: '300px' }}>
                                            <source src={url} type="video/mp4" />
                                            Seu navegador não suporta o elemento de vídeo.
                                        </video>
                                    ) : (
                                        <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                                            <iframe
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                                src={getEmbedUrl(url)}
                                                title={`Video ${i + 1}`}
                                                allowFullScreen
                                            />
                                        </Box>
                                    )}
                                </Box>
                            ))
                        ) : (
                            <Typography color="text.secondary">Nenhum vídeo anexado.</Typography>
                        )}
                    </Stack>
                </Paper>

                {/* Votes List */}
                {votes.length > 0 && (
                    <Paper elevation={0} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Votos dos Comissários</Typography>
                        <List disablePadding>
                            {votes.map((vote, index) => (
                                <ListItem key={index} alignItems="flex-start" sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" fontWeight="bold">{vote.adminName}</Typography>
                                                <Chip
                                                    label={vote.verdict === 'punish' ? 'PUNIR' : 'ABSOLVER'}
                                                    color={vote.verdict === 'punish' ? 'error' : 'success'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {vote.reason}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Stack>

            {/* Sticky Footer for Voting */}
            {lifecyclePhase === 'voting' && !hasVoted && (
                <Paper
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 2,
                        zIndex: 1100,
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'background.paper'
                    }}
                    elevation={10}
                >
                    {!showVoteForm ? (
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            onClick={() => setShowVoteForm(true)}
                        >
                            VOTAR AGORA
                        </Button>
                    ) : (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Registrar Voto</Typography>
                                <Button size="small" onClick={() => setShowVoteForm(false)}>Cancelar</Button>
                            </Box>

                            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                                <RadioGroup row value={verdict} onChange={(e) => setVerdict(e.target.value as any)} sx={{ justifyContent: 'space-around' }}>
                                    <FormControlLabel
                                        value="punish"
                                        control={<Radio color="error" />}
                                        label={<Typography color="error" fontWeight="bold">PUNIR</Typography>}
                                    />
                                    <FormControlLabel
                                        value="acquit"
                                        control={<Radio color="success" />}
                                        label={<Typography color="success" fontWeight="bold">ABSOLVER</Typography>}
                                    />
                                </RadioGroup>
                            </FormControl>

                            <TextField
                                label="Justificativa (Obrigatório)"
                                multiline
                                rows={2}
                                fullWidth
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                sx={{ mb: 2 }}
                                variant="filled"
                            />

                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                onClick={handleSubmitVote}
                                disabled={voting || !reason.trim()}
                                sx={{
                                    bgcolor: verdict === 'punish' ? 'error.main' : 'success.main',
                                    '&:hover': {
                                        bgcolor: verdict === 'punish' ? 'error.dark' : 'success.dark',
                                    }
                                }}
                            >
                                CONFIRMAR {verdict === 'punish' ? 'PUNIÇÃO' : 'ABSOLVIÇÃO'}
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Edit Dialog */}
            <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar Protesto</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Descrição"
                            multiline
                            rows={4}
                            fullWidth
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                        <TextField
                            label="Links de Vídeo (um por linha)"
                            multiline
                            rows={3}
                            fullWidth
                            value={editForm.videoUrls}
                            onChange={(e) => setEditForm({ ...editForm, videoUrls: e.target.value })}
                            helperText="Cole os links do YouTube ou URLs diretas, separados por quebra de linha."
                        />
                        <TextField
                            label="Tipo de Incidente"
                            fullWidth
                            value={editForm.incidentType}
                            onChange={(e) => setEditForm({ ...editForm, incidentType: e.target.value })}
                        />
                        <TextField
                            label="Bateria"
                            fullWidth
                            value={editForm.heat}
                            onChange={(e) => setEditForm({ ...editForm, heat: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveEdit} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
