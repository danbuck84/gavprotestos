import { useState, type FormEvent } from 'react';
import {
    Container, Typography, TextField, Button, Box,
    Select, FormControl, InputLabel, MenuItem, Alert, CircularProgress, LinearProgress, Paper
} from '@mui/material';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import type { FeedbackType } from '../types';

export default function Suporte() {
    const navigate = useNavigate();
    const [type, setType] = useState<FeedbackType | ''>('');
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const feedbackTypes: FeedbackType[] = ['Bug', 'Sugestão', 'Reclamação', 'Outros'];

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validar tipo de arquivo
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setFeedback({ type: 'error', text: 'Apenas imagens JPG, PNG ou WEBP são permitidas.' });
                return;
            }

            // Validar tamanho (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setFeedback({ type: 'error', text: 'Imagem muito grande. Tamanho máximo: 5MB.' });
                return;
            }

            setImageFile(file);
            setFeedback(null);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!auth.currentUser) {
            setFeedback({ type: 'error', text: 'Você precisa estar logado.' });
            return;
        }

        if (!type || message.trim().length < 10) {
            setFeedback({ type: 'error', text: 'Preencha todos os campos. A mensagem deve ter no mínimo 10 caracteres.' });
            return;
        }

        setSubmitting(true);
        setFeedback(null);

        try {
            let attachmentUrl: string | undefined;

            // Upload da imagem se houver
            if (imageFile) {
                const userId = auth.currentUser.uid.replace('steam:', '');
                const timestamp = Date.now();
                const storageRef = ref(storage, `feedback_attachments/${userId}/${timestamp}_${imageFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, imageFile);

                attachmentUrl = await new Promise<string>((resolve, reject) => {
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
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        }
                    );
                });
            }

            // Buscar nome do usuário
            let userName = 'Piloto';
            const userId = auth.currentUser.uid.replace('steam:', '');

            // Tentar pegar do auth primeiro
            if (auth.currentUser.displayName) {
                userName = auth.currentUser.displayName;
            } else {
                // Buscar nas races
                const racesSnap = await getDocs(collection(db, 'races'));
                for (const raceDoc of racesSnap.docs) {
                    const race = raceDoc.data();
                    if (race.drivers && Array.isArray(race.drivers)) {
                        const driver = race.drivers.find((d: { steamId: string; name: string }) =>
                            d.steamId === userId || d.steamId === auth.currentUser?.uid
                        );
                        if (driver && driver.name) {
                            userName = driver.name;
                            break;
                        }
                    }
                }
            }

            // Salvar feedback no Firestore
            await addDoc(collection(db, 'feedback'), {
                userId,
                userName,
                type,
                message: message.trim(),
                attachmentUrl: attachmentUrl || null,
                status: 'open',
                createdAt: serverTimestamp()
            });

            setFeedback({ type: 'success', text: 'Mensagem enviada à administração com sucesso!' });

            // Limpar formulário
            setType('');
            setMessage('');
            setImageFile(null);
            setUploadProgress(0);

            // Redirect após 2s
            setTimeout(() => navigate('/'), 2000);

        } catch (error) {
            console.error("Error submitting feedback:", error);
            setFeedback({ type: 'error', text: 'Erro ao enviar mensagem. Tente novamente.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
            <Button onClick={() => navigate('/')} sx={{ mb: 2 }}>
                &lt; Voltar
            </Button>

            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Fale Conosco
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Encontrou algum bug? Tem uma sugestão? Quer fazer uma reclamação? Envie sua mensagem para a administração.
                </Typography>

                {feedback && (
                    <Alert severity={feedback.type} sx={{ mb: 3 }}>
                        {feedback.text}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Assunto / Tipo</InputLabel>
                        <Select
                            value={type}
                            label="Assunto / Tipo"
                            onChange={(e) => setType(e.target.value as FeedbackType)}
                        >
                            {feedbackTypes.map((feedbackType) => (
                                <MenuItem key={feedbackType} value={feedbackType}>
                                    {feedbackType}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Mensagem"
                        multiline
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        fullWidth
                        margin="normal"
                        helperText="Descreva sua mensagem com o máximo de detalhes possível (mínimo 10 caracteres)."
                    />

                    <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Anexar Print (Opcional)
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                            Envie uma imagem se necessário. Formatos aceitos: JPG, PNG, WEBP (máx 5MB).
                        </Typography>

                        <Button
                            variant="outlined"
                            component="label"
                            fullWidth
                            sx={{ mb: 1 }}
                        >
                            {imageFile ? imageFile.name : 'Selecionar Imagem'}
                            <input
                                type="file"
                                hidden
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                            />
                        </Button>

                        {imageFile && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => setImageFile(null)}
                                fullWidth
                            >
                                Remover Imagem
                            </Button>
                        )}

                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <Box sx={{ width: '100%', mt: 2 }}>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                                <Typography variant="caption" color="text.secondary">
                                    {Math.round(uploadProgress)}% enviado
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Enviar Mensagem'}
                    </Button>
                </form>
            </Paper>
        </Container>
    );
}
