import { useEffect, useState } from 'react';
import { Button, Container, Typography, CircularProgress, Box, Divider, Alert } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { functions, auth } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const handleSteamLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const authWithSteam = httpsCallable(functions, 'authWithSteam');
            // Expecting { url: string } in response.data
            const result = await authWithSteam();
            const data = result.data as { url: string };
            if (data.url) {
                // Redirect to Steam OpenID (works perfectly on mobile)
                window.location.href = data.url;
            } else {
                setError('Erro ao gerar URL de autenticação da Steam.');
                setLoading(false);
            }
        } catch (error: any) {
            console.error("Error initiating login", error);
            setError(`Erro ao conectar com Steam: ${error.message || 'Tente novamente.'}`);
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInAnonymously(auth);
            navigate('/');
        } catch (error: any) {
            console.error("Dev login failed", error);
            setError(`Login de teste falhou: ${error.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        const processLogin = async () => {
            // Check if returning from Steam (openid.mode is present)
            if (searchParams.has('openid.mode')) {
                setLoading(true);
                setError(null);
                const params: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });

                console.log('[Login] Processing Steam callback with params:', Object.keys(params));

                try {
                    const validateSteamLogin = httpsCallable(functions, 'validateSteamLogin');
                    const result = await validateSteamLogin(params);
                    const data = result.data as { token: string };

                    if (data.token) {
                        console.log('[Login] Custom token received, signing in...');
                        await signInWithCustomToken(auth, data.token);
                        console.log('[Login] Successfully authenticated, redirecting to dashboard...');
                        navigate('/');
                    } else {
                        setError('Token de autenticação não foi retornado pela Steam.');
                        setLoading(false);
                    }
                } catch (error: any) {
                    console.error("[Login] Validation failed", error);
                    setError(`Falha na validação da Steam: ${error.message || 'Verifique sua conexão e tente novamente.'}`);
                    setLoading(false);
                }
            }
        };
        processLogin();
    }, [searchParams, navigate]);

    return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                Login
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <CircularProgress />
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSteamLogin}
                    >
                        Entrar com a Steam
                    </Button>

                    {/* Dev Login - Only for development/testing */}
                    <Divider>OU</Divider>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleDevLogin}
                    >
                        Login de Teste (Dev)
                    </Button>
                </Box>
            )}
        </Container>
    );
}
