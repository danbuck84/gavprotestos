import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Button, TextField,
    FormControl, RadioGroup, FormControlLabel, Radio,
    CircularProgress, Chip, List, ListItem, ListItemText, Alert, Snackbar
} from '@mui/material';
import { doc, collection, addDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { Protest, Vote, ProtestStatus, Race } from '../types';

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

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    useEffect(() => {
        if (!id) return;

        const unsubscribeProtest = onSnapshot(doc(db, 'protests', id), async (docSnap) => {
            if (docSnap.exists()) {
                const protestData = { id: docSnap.id, ...docSnap.data() } as Protest;
                setProtest(protestData);

                // Fetch Race Data for Lifecycle Logic
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
            }
        });

        return () => {
            unsubscribeProtest();
            unsubscribeVotes();
        };
    }, [id, navigate]);

    // Lifecycle Logic
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

                // Auto-start judgment (Pending -> Under Review)
                if (protest.status === 'pending') {
                    await updateDoc(doc(db, 'protests', protest.id), { status: 'under_review' });
                }
            } else {
                setLifecyclePhase('concluded');
                setTimeRemaining('Votação Encerrada');

                // Auto-conclude judgment
                if (protest.status !== 'concluded' && protest.status !== 'inconclusive') {
                    // Calculate Verdict
                    // We need to fetch votes again or rely on state? State is safe here as it comes from snapshot.
                    // However, 'votes' state might not be populated yet on first render.
                    // But this effect runs when 'race' and 'protest' change. 'votes' is separate.
                    // Let's assume we have votes. If votes are empty, it might be inconclusive or just no one voted.

                    // Wait for votes to load? 'loading' is false.
                    // Let's trigger calculation.
                    calculateAndSaveVerdict();
                }
            }
        };

        checkLifecycle();
        const interval = setInterval(checkLifecycle, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [race, protest, votes]); // Added votes dependency to ensure we have them for calculation

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
            // No snackbar here to avoid spamming on auto-update
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
        } catch (error) {
            console.error("Error submitting vote:", error);
            setSnackbar({ open: true, message: 'Erro ao registrar voto.', severity: 'error' });
        } finally {
            setVoting(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    }

    if (!protest) return null;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Button onClick={() => navigate('/admin')} sx={{ mb: 2 }}>&lt; Voltar ao Painel</Button>

            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4">Julgamento de Protesto</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                        <Chip
                            label={protest.status.toUpperCase().replace('_', ' ')}
                            color={protest.status === 'concluded' ? 'success' : protest.status === 'under_review' ? 'warning' : 'default'}
                            sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                            {timeRemaining}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Acusador:</Typography>
                        <Typography gutterBottom>{protest.accuserId}</Typography>

                        <Typography variant="subtitle1" fontWeight="bold">Acusado:</Typography>
                        <Typography gutterBottom>{protest.accusedId}</Typography>

                        <Typography variant="subtitle1" fontWeight="bold">Incidente:</Typography>
                        <Typography gutterBottom>{protest.incidentType} (Volta {protest.lap})</Typography>

                        <Typography variant="subtitle1" fontWeight="bold">Bateria / Posições Perdidas:</Typography>
                        <Typography gutterBottom>{protest.heat} / {protest.positionsLost}</Typography>
                    </Box>

                    <Box sx={{ flex: 2, minWidth: 300 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Descrição:</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                            <Typography>{protest.description}</Typography>
                        </Paper>

                        <Typography variant="subtitle1" fontWeight="bold">Vídeos:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {protest.videoUrls && protest.videoUrls.length > 0 ? (
                                protest.videoUrls.map((url, i) => (
                                    <Button key={i} variant="outlined" href={url} target="_blank" size="small">
                                        Assistir Vídeo {i + 1}
                                    </Button>
                                ))
                            ) : (
                                (protest as any).videoUrl && (
                                    <Button variant="outlined" href={(protest as any).videoUrl} target="_blank" size="small">
                                        Assistir Vídeo
                                    </Button>
                                )
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* Lifecycle Info */}
            {lifecyclePhase === 'submission' && (
                <Alert severity="info" sx={{ mb: 4 }}>
                    A votação ainda não foi aberta. Aguarde o fim do prazo de envio de protestos (24h após a corrida).
                </Alert>
            )}

            {/* Voting Section */}
            {(lifecyclePhase === 'voting' || lifecyclePhase === 'concluded') && (
                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" gutterBottom>Votação</Typography>

                        {lifecyclePhase === 'voting' && !hasVoted && (
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Seu Voto</Typography>
                                <FormControl component="fieldset">
                                    <RadioGroup row value={verdict} onChange={(e) => setVerdict(e.target.value as any)}>
                                        <FormControlLabel value="punish" control={<Radio />} label="PUNIR (Sim)" />
                                        <FormControlLabel value="acquit" control={<Radio />} label="ABSOLVER (Não)" />
                                    </RadioGroup>
                                </FormControl>
                                <TextField
                                    label="Justificativa"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    sx={{ mt: 2, mb: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleSubmitVote}
                                    disabled={voting || !reason.trim()}
                                >
                                    Confirmar Voto
                                </Button>
                            </Paper>
                        )}

                        {hasVoted && lifecyclePhase === 'voting' && (
                            <Alert severity="success" sx={{ mb: 3 }}>Você já votou neste protesto.</Alert>
                        )}

                        {lifecyclePhase === 'concluded' && (
                            <Alert severity="info" sx={{ mb: 3 }}>Votação encerrada.</Alert>
                        )}

                        <Typography variant="subtitle1" gutterBottom>Votos Registrados ({votes.length})</Typography>
                        <List>
                            {votes.map((vote, index) => (
                                <Paper key={index} sx={{ mb: 1, p: 1 }}>
                                    <ListItem alignItems="flex-start">
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography fontWeight="bold">{vote.adminName}</Typography>
                                                    <Chip
                                                        label={vote.verdict === 'punish' ? 'PUNIR' : 'ABSOLVER'}
                                                        color={vote.verdict === 'punish' ? 'error' : 'success'}
                                                        size="small"
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {new Date(vote.createdAt).toLocaleString()}
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                                        {vote.reason}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                </Paper>
                            ))}
                        </List>
                    </Box>

                    {/* Result Section */}
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" gutterBottom>Resultado</Typography>

                        {protest.status === 'concluded' || protest.status === 'inconclusive' ? (
                            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: protest.verdict === 'Punido' ? '#ffebee' : '#e8f5e9' }}>
                                <Typography variant="h3" gutterBottom>
                                    {protest.verdict}
                                </Typography>
                                <Typography variant="body1">
                                    Julgamento encerrado automaticamente.
                                </Typography>
                            </Paper>
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body1" paragraph>
                                    O julgamento está em andamento.
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    O veredito será calculado automaticamente após 48h do evento.
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
