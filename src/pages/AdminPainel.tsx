import { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Box, Paper, TextField, Button, Alert,
    Tabs, Tab, Pagination, Chip, CircularProgress, InputAdornment, List, ListItem, ListItemText, Divider, IconButton, Card, CardContent, CardActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { parseRaceJson } from '../services/raceParser';
import {
    collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Race, Protest, Feedback } from '../types';
import { formatDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

const ITEMS_PER_PAGE = 10;

export default function AdminPainel() {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [races, setRaces] = useState<Race[]>([]);
    const [protests, setProtests] = useState<Protest[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

    // New state for tabs, search and pagination
    const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0); // 0 = Em Andamento, 1 = Histórico, 2 = Feedback
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

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

        const qFeedbacks = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const unsubscribeFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
            const feedbacksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Feedback[];
            setFeedbacks(feedbacksData);
        });

        return () => {
            unsubscribeRaces();
            unsubscribeProtests();
            unsubscribeFeedbacks();
        };
    }, []);

    // Helper: Check if race deadline is still open (< 24h from race date)
    const isDeadlineOpen = (raceDate: string): boolean => {
        const raceTime = new Date(raceDate).getTime();
        const deadline = raceTime + (24 * 60 * 60 * 1000); // +24h
        return Date.now() < deadline;
    };

    // Helper: Check if race is recent (within last 7 days)
    const isRecentRace = (raceDate: string): boolean => {
        const raceTime = new Date(raceDate).getTime();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // -7 days
        return raceTime > sevenDaysAgo;
    };

    // Helper: Check if race is active (needs attention)
    const isRaceActive = (race: Race, raceProtests: Protest[]): boolean => {
        const isRecent = isRecentRace(race.date);
        const hasActiveProtests = raceProtests.some(p =>
            p.status === 'pending' || p.status === 'under_review'
        );
        return isRecent || hasActiveProtests;
    };

    // Filter races by search query
    const filterBySearch = (race: Race): boolean => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const eventMatch = race.eventName.toLowerCase().includes(query);
        const trackMatch = race.trackName.toLowerCase().includes(query);
        const dateMatch = formatDate(race.date).toLowerCase().includes(query);

        return eventMatch || trackMatch || dateMatch;
    };

    // Helper: Get session type configuration for badge
    const getSessionTypeConfig = (type: string) => {
        switch (type) {
            case 'RACE':
                return { label: 'CORRIDA', color: 'error' as const }; // Vermelho
            case 'QUALIFY':
                return { label: 'QUALIFY', color: 'secondary' as const }; // Roxo
            case 'PRACTICE':
                return { label: 'TREINO', color: 'default' as const }; // Cinza
            default:
                return { label: type, color: 'default' as const };
        }
    };

    // Separate races into active and historical
    const { activeRaces, historicalRaces } = useMemo(() => {
        const active: Race[] = [];
        const historical: Race[] = [];

        races.forEach(race => {
            const raceProtests = protests.filter(p => p.raceId === race.id);
            if (isRaceActive(race, raceProtests)) {
                active.push(race);
            } else {
                historical.push(race);
            }
        });

        // Sort both by most recent first
        const sortByDate = (a: Race, b: Race) => new Date(b.date).getTime() - new Date(a.date).getTime();
        active.sort(sortByDate);
        historical.sort(sortByDate);

        return { activeRaces: active, historicalRaces: historical };
    }, [races, protests]);

    // Get races to display based on active tab
    const racesToDisplay = activeTab === 0 ? activeRaces : historicalRaces;

    // Apply search filter
    const filteredRaces = useMemo(() => {
        return racesToDisplay.filter(filterBySearch);
    }, [racesToDisplay, searchQuery]);

    // Apply pagination (only for historical tab)
    const { paginatedRaces, totalPages } = useMemo(() => {
        if (activeTab === 0) {
            // No pagination for "Em Andamento"
            return { paginatedRaces: filteredRaces, totalPages: 1 };
        }

        const total = Math.ceil(filteredRaces.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginated = filteredRaces.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return { paginatedRaces: paginated, totalPages: total };
    }, [filteredRaces, currentPage, activeTab]);

    // Reset to page 1 when changing tabs or search query
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

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

                // Generate deterministic ID: timestamp_track_type
                const raceTimestamp = new Date(raceData.date).getTime();
                const trackSlug = raceData.trackName.toLowerCase().replace(/\s+/g, '_');
                const typeSlug = (raceData.type || 'race').toLowerCase();
                const deterministicId = `${raceTimestamp}_${trackSlug}_${typeSlug}`;

                // Check if this exact session already exists
                const existingDoc = await getDoc(doc(db, 'races', deterministicId));
                if (existingDoc.exists()) {
                    setMessage({
                        type: 'error',
                        text: `Sessão já importada. Esta corrida já existe no sistema.`
                    });
                    setUploading(false);
                    return;
                }

                // Save with deterministic ID
                await setDoc(doc(db, 'races', deterministicId), {
                    ...raceData,
                    uploadedAt: serverTimestamp()
                });

                // Process drivers (create/update users)
                let driversCreated = 0;
                let driversUpdated = 0;
                for (const driver of raceData.drivers) {
                    const userDocRef = doc(db, 'users', driver.steamId);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        // Update if name changed
                        const existingData = userDoc.data();
                        if (existingData.displayName !== driver.name) {
                            await updateDoc(userDocRef, {
                                displayName: driver.name
                            });
                            driversUpdated++;
                        }
                    } else {
                        // Create new user
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
                    text: `Corrida "${raceData.eventName || raceData.trackName}" importada com sucesso! ID: ${deterministicId} com ${raceData.drivers.length} pilotos (${driversCreated} novos, ${driversUpdated} atualizados).`
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

    const handleTabChange = (_event: React.SyntheticEvent, newValue: 0 | 1 | 2) => {
        setActiveTab(newValue);
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
        setCurrentPage(page);
        // Scroll to top when changing pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleMarkAsRead = async (feedbackId: string) => {
        try {
            await updateDoc(doc(db, 'feedback', feedbackId), {
                status: 'read'
            });
        } catch (error) {
            console.error("Error marking feedback as read:", error);
            setMessage({ type: 'error', text: 'Erro ao marcar feedback como lido.' });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
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

            {/* Import Section */}
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

            {/* Race Management Section */}
            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom>Gestão de Corridas</Typography>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange}>
                        <Tab
                            label={`Ativas (${activeRaces.length})`}
                            sx={{ fontWeight: activeTab === 0 ? 'bold' : 'normal' }}
                        />
                        <Tab
                            label={`Histórico (${historicalRaces.length})`}
                            sx={{ fontWeight: activeTab === 1 ? 'bold' : 'normal' }}
                        />
                        <Tab
                            label={`Caixa de Entrada (${feedbacks.filter(f => f.status === 'open').length})`}
                            sx={{ fontWeight: activeTab === 2 ? 'bold' : 'normal' }}
                        />
                    </Tabs>
                </Box>

                {/* Search Bar */}
                <TextField
                    fullWidth
                    placeholder="Buscar por Etapa, Pista ou Data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 3 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Race Cards Grid */}
                {filteredRaces.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {searchQuery
                                ? 'Nenhuma corrida encontrada com os critérios de busca.'
                                : activeTab === 0
                                    ? 'Nenhuma corrida em andamento no momento.'
                                    : 'Nenhuma corrida no histórico.'}
                        </Typography>
                    </Paper>
                ) : (
                    <>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                            {paginatedRaces.map((race) => {
                                const raceProtests = protests.filter(p => p.raceId === race.id);
                                const pendingCount = raceProtests.filter(p => p.status === 'pending').length;
                                const reviewCount = raceProtests.filter(p => p.status === 'under_review').length;
                                const concludedCount = raceProtests.filter(p => p.status === 'concluded').length;
                                const totalCount = raceProtests.length;
                                const deadlineOpen = isDeadlineOpen(race.date);

                                // Card title logic: prioritize eventName
                                const cardTitle = race.eventName || race.trackName;
                                const cardSubtitle = race.eventName
                                    ? `${race.trackName} • ${formatDate(race.date)}`
                                    : formatDate(race.date);

                                // Check if race is completed
                                const allProtestsConcluded = totalCount > 0 &&
                                    raceProtests.every(p => p.status === 'concluded');
                                const isOldRace = !deadlineOpen;
                                const isCompleted = allProtestsConcluded && isOldRace;

                                // Session type config
                                const sessionType = getSessionTypeConfig(race.type);

                                return (
                                    <Paper
                                        key={race.id}
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: deadlineOpen ? '2px solid' : 'none',
                                            borderColor: deadlineOpen ? 'warning.main' : 'transparent',
                                            '&:hover': {
                                                elevation: 6,
                                                transform: 'translateY(-2px)',
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                        onClick={() => navigate(`/admin/corrida/${race.id}`)}
                                    >
                                        {/* Badge de Tipo de Sessão */}
                                        <Chip
                                            label={sessionType.label}
                                            color={sessionType.color}
                                            size="small"
                                            sx={{ mb: 1 }}
                                        />

                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            {cardTitle}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {cardSubtitle}
                                        </Typography>

                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                            {deadlineOpen && (
                                                <Chip
                                                    label="Prazo Aberto"
                                                    color="info"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
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
                                                    label={`${reviewCount} Em Votação`}
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
                                            {isCompleted && (
                                                <Chip
                                                    label="Concluída"
                                                    color="success"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {totalCount === 0 && !deadlineOpen && (
                                                <Chip
                                                    label="Sem protestos"
                                                    color="default"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>

                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            👥 {race.drivers.length} pilotos • {totalCount} protesto{totalCount !== 1 ? 's' : ''}
                                        </Typography>
                                    </Paper>
                                );
                            })}
                        </Box>

                        {/* Pagination (only for Historical tab) */}
                        {activeTab === 1 && totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={handlePageChange}
                                    color="primary"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* FEEDBACK TAB (activeTab === 2) */}
            {activeTab === 2 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Mensagens dos Pilotos</Typography>

                    {feedbacks.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                Nenhuma mensagem recebida ainda.
                            </Typography>
                        </Paper>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Open Feedbacks First */}
                            {feedbacks
                                .filter(f => f.status === 'open')
                                .map((feedback) => {
                                    const typeConfig = {
                                        'Bug': { color: 'error' as const, label: '🐛 Bug' },
                                        'Sugestão': { color: 'success' as const, label: '💡 Sugestão' },
                                        'Reclamação': { color: 'warning' as const, label: '⚠️ Reclamação' },
                                        'Outros': { color: 'default' as const, label: '📝 Outros' }
                                    };
                                    const config = typeConfig[feedback.type];

                                    return (
                                        <Card key={feedback.id} elevation={3}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Box>
                                                        <Typography variant="h6">{feedback.userName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(feedback.createdAt).toLocaleString('pt-BR')}
                                                        </Typography>
                                                    </Box>
                                                    <Chip label={config.label} color={config.color} />
                                                </Box>

                                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                                    {feedback.message}
                                                </Typography>

                                                {feedback.attachmentUrl && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<AttachFileIcon />}
                                                            onClick={() => window.open(feedback.attachmentUrl, '_blank')}
                                                        >
                                                            Ver Anexo
                                                        </Button>
                                                    </Box>
                                                )}
                                            </CardContent>
                                            <CardActions sx={{ justifyContent: 'flex-end' }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => handleMarkAsRead(feedback.id)}
                                                >
                                                    Marcar como Lido
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    );
                                })}

                            {/* Read Feedbacks (Collapsed or Faded) */}
                            {feedbacks.filter(f => f.status === 'read').length > 0 && (
                                <>
                                    <Divider sx={{ my: 2 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Mensagens Lidas ({feedbacks.filter(f => f.status === 'read').length})
                                        </Typography>
                                    </Divider>

                                    {feedbacks
                                        .filter(f => f.status === 'read')
                                        .slice(0, 10) // Show only last 10 read
                                        .map((feedback) => {
                                            const typeConfig = {
                                                'Bug': { color: 'error' as const, label: '🐛 Bug' },
                                                'Sugestão': { color: 'success' as const, label: '💡 Sugestão' },
                                                'Reclamação': { color: 'warning' as const, label: '⚠️ Reclamação' },
                                                'Outros': { color: 'default' as const, label: '📝 Outros' }
                                            };
                                            const config = typeConfig[feedback.type];

                                            return (
                                                <Card key={feedback.id} elevation={1} sx={{ opacity: 0.6 }}>
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Box>
                                                                <Typography variant="subtitle1">{feedback.userName}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(feedback.createdAt).toLocaleString('pt-BR')}
                                                                </Typography>
                                                            </Box>
                                                            <Chip label={config.label} color={config.color} size="small" />
                                                        </Box>

                                                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                                            {feedback.message.substring(0, 100)}
                                                            {feedback.message.length > 100 && '...'}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            {/* Delete Management Section (collapsed list) */}
            <Box sx={{ mt: 6 }}>
                <Typography variant="h6" gutterBottom>Gerenciamento Rápido</Typography>
                {races.length === 0 ? (
                    <Typography color="text.secondary">Nenhuma corrida cadastrada.</Typography>
                ) : (
                    <Paper elevation={2}>
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                            {races
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((race, index) => (
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
        </Container>
    );
}
