import { Card, CardContent, CardActions, Typography, Button, Chip, Box, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Protest } from '../types';
import { translateStatus } from '../utils/translations';

import UserName from './UserName';

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
        <Card sx={{ mb: 2, width: '100%' }}>
            <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>

                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        <UserName uid={protest.accusedId} variant="h6" fontWeight="bold" />
                    </Typography>
                    <Chip
                        label={translateStatus(protest.status)}
                        color={getStatusColor(protest.status) as any}
                        size="small"
                        variant="outlined"
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Etapa: {protest.raceId}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Bateria: {protest.heat}
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.primary" sx={{
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    mb: 1
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
                    onClick={() => navigate(isAdminView ? `/admin/julgamento/${protest.id}` : `/admin/julgamento/${protest.id}`)} // Both go to detail for now, maybe different for user?
                >
                    Ver Detalhes
                </Button>
            </CardActions>
        </Card>
    );
}
