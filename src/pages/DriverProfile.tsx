import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper,
    List, ListItem, ListItemText, Divider, Chip, CircularProgress, Avatar, ListItemButton, Button
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Protest, Race } from '../types';
import UserName from '../components/UserName';
import { translateStatus } from '../utils/translations';
import { formatDateOnly } from '../utils/dateUtils';
import { getInitials, formatSteamId } from '../utils/stringUtils';

export default function DriverProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>(''); // BUG FIX 1: Para o avatar com iniciais
    const [racesMap, setRacesMap] = useState<Map<string, Race>>(new Map()); // BUG FIX 3: Para nomes de corrida
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
                // Clean ID - remove steam: prefix if present (protests are saved without it)
                const cleanId = id.startsWith('steam:') ? id.replace('steam:', '') : id;

                console.log('🔍 DriverProfile - Fetching protests for ID:', id, '→ Clean ID:', cleanId);

                // BUG FIX 3: Fetch all races to build a map
                const racesSnap = await getDocs(collection(db, 'races'));
                const racesData = new Map<string, Race>();
                racesSnap.docs.forEach(doc => {
                    racesData.set(doc.id, { id: doc.id, ...doc.data() } as Race);
                });
                setRacesMap(racesData);
                console.log('🏁 Loaded races map:', racesData.size);

                // BUG FIX 1: Search for user name in races drivers
                let foundUserName = 'Piloto';
                for (const [, race] of racesData) {
                    if (race.drivers && Array.isArray(race.drivers)) {
                        const driver = race.drivers.find(d =>
                            d.steamId === cleanId || d.steamId === id || d.steamId === `steam:${cleanId}`
                        );
                        if (driver && driver.name) {
                            foundUserName = driver.name;
                            break;
                        }
                    }
                }
                setUserName(foundUserName);
                console.log('👤 Found user name:', foundUserName);

                // Fetch Protests where user is accused (NO orderBy to avoid index requirement)
                const qAccused = query(
                    collection(db, 'protests'),
                    where('accusedId', '==', cleanId)
                );
                const accusedSnap = await getDocs(qAccused);
                const accusedProtests = accusedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));
                console.log('📥 Found protests where user is ACCUSED:', accusedProtests.length, accusedProtests);

                // Fetch Protests where user is accuser (NO orderBy to avoid index requirement)
                const qAccuser = query(
                    collection(db, 'protests'),
                    where('accuserId', '==', cleanId)
                );
                const accuserSnap = await getDocs(qAccuser);
                const accuserProtests = accuserSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protest));
                console.log('📥 Found protests where user is ACCUSER:', accuserProtests.length, accuserProtests);

                // Combine and sort client-side (no index needed!)
                const allProtests = [...accusedProtests, ...accuserProtests].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                console.log('📊 Total combined protests:', allProtests.length);

                // Remove duplicates if any (shouldn't be, but good practice)
                const uniqueProtests = Array.from(new Map(allProtests.map(item => [item.id, item])).values());
                console.log('✅ Unique protests after deduplication:', uniqueProtests.length);

                setHistory(uniqueProtests);

                // Calculate Stats
                const penaltiesCount = accusedProtests.filter(p =>
                    p?.status === 'accepted' || (p?.status === 'concluded' && p?.verdict === 'Punido')
                ).length;

                console.log('📊 Stats calculation:', {
                    protestsInvolved: uniqueProtests.length,
                    penalties: penaltiesCount,
                    accusedProtestsCount: accusedProtests.length,
                    accuserProtestsCount: accuserProtests.length
                });

                setStats({
                    protestsInvolved: uniqueProtests.length,
                    penalties: penaltiesCount,
                    wins: 0
                });

            } catch (error) {
                console.error("❌ Error fetching driver data:", error);
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
            {/* Header */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                {/* BUG FIX 1: Avatar com iniciais */}
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 'bold' }}>
                    {getInitials(userName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h4">
                        <UserName uid={id} variant="h6" />
                    </Typography>
                    {/* BUG FIX 2: SteamID com truncação + TAREFA 1: Máscara de privacidade */}
                    <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                        }}
                    >
                        ID: {formatSteamId(id)}
                    </Typography>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="primary">{stats.protestsInvolved}</Typography>
                        <Typography variant="body2" color="text.secondary">Protestos Envolvido</Typography>
                    </Paper>
                </Box>
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="error">{stats.penalties}</Typography>
                        <Typography variant="body2" color="text.secondary">Punições Recebidas</Typography>
                    </Paper>
                </Box>
            </Box>

            {/* History */}
            <Typography variant="h5" gutterBottom>Histórico de Protestos</Typography>
            {!history || history.length === 0 ? (
                <Typography color="text.secondary">Nenhum registro encontrado.</Typography>
            ) : (
                <Paper elevation={2}>
                    <List>
                        {history.map((protest, index) => {
                            // BUG FIX 3: Buscar nome da corrida
                            const race = racesMap.get(protest.raceId);
                            const raceName = race?.eventName || 'Evento Desconhecido';

                            // BUG FIX 4: Lógica correta de "Contra Quem"
                            const cleanId = id?.startsWith('steam:') ? id.replace('steam:', '') : id;
                            const isAccuser = protest.accuserId === cleanId;
                            const opponentId = isAccuser ? protest.accusedId : protest.accuserId;
                            const opponentLabel = isAccuser ? 'Contra' : 'Por';
                            const roleLabel = isAccuser ? 'Autor' : 'Acusado';

                            return (
                                <Box key={protest.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton onClick={() => navigate(`/admin/julgamento/${protest.id}`)}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            {roleLabel} em {raceName}
                                                        </Typography>
                                                        <Chip
                                                            label={protest?.status === 'concluded' ? (protest?.verdict || 'Concluído') : translateStatus(protest?.status || '')}
                                                            color={protest?.status === 'concluded' && protest?.verdict === 'Punido' ? 'error' : 'default'}
                                                            size="small"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography component="span" variant="body2" color="text.primary">
                                                            {opponentLabel}: <UserName uid={opponentId} />
                                                        </Typography>
                                                        <br />
                                                        {formatDateOnly(protest.createdAt)} - {protest?.description?.substring(0, 100) || 'Sem descrição'}...
                                                    </>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < history.length - 1 && <Divider />}
                                </Box>
                            );
                        })}
                    </List>
                </Paper>
            )}
            {/* Logout Button (Only for own profile) */}
            {auth.currentUser && (auth.currentUser.uid === id || id === 'me' || id === auth.currentUser.uid.replace('steam:', '')) && (
                <Box sx={{ mt: 6, mb: 4 }}>
                    <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        size="large"
                        startIcon={<LogoutIcon />}
                        onClick={async () => {
                            if (window.confirm("Deseja realmente sair?")) {
                                await signOut(auth);
                                navigate('/login');
                            }
                        }}
                        sx={{ fontWeight: 'bold', py: 1.5 }}
                    >
                        SAIR DO SISTEMA
                    </Button>
                </Box>
            )}
        </Container>
    );
}
