import { Card, CardContent, CardActions, Typography, Button, Chip, Box, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Protest } from '../types';
import { translateStatus } from '../utils/translations';

import UserName from './UserName';
import RaceName from './RaceName';

interface ProtestCardProps {
    protest: Protest;
    isAdminView?: boolean;
}

export default function ProtestCard({ protest, isAdminView = false }: ProtestCardProps) {
    const navigate = useNavigate();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'under_review': return 'info';
            case 'concluded': return 'success';
            case 'inconclusive': return 'default';
            default: return 'default';
        }
    };

    return (
        <Card
            sx={{ mb: 2, width: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
            onClick={() => navigate(isAdminView ? `/admin/julgamento/${protest.id}` : `/admin/julgamento/${protest.id}`)}
        >
            <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, minWidth: 0 }}>
                    <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Contra:
                        </Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <UserName uid={protest.accusedId} variant="h6" fontWeight="bold" />
                        </Typography>
                    </Box>
                    <Chip
                        label={translateStatus(protest.status)}
                        color={getStatusColor(protest.status) as any}
                        size="small"
                        variant="outlined"
                        sx={{ flexShrink: 0 }}
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Etapa: <RaceName raceId={protest.raceId} />
                </Typography>

                <Typography variant="body2" color="text.primary" sx={{
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    mb: 1,
                    wordBreak: 'break-word'
                }}>
                    {protest.description}
                </Typography>
            </CardContent>
            <Divider />
            <CardActions>
                <Button
                    size="medium"
                    fullWidth
                    variant="text"
                    color="primary"
                    onClick={(e) => {
                        e.stopPropagation(); // Evita duplo clique se clicar no botão
                        navigate(isAdminView ? `/admin/julgamento/${protest.id}` : `/admin/julgamento/${protest.id}`);
                    }}
                >
                    Ver Detalhes
                </Button>
            </CardActions>
        </Card>
    );
}
