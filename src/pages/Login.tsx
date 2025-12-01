import { useEffect, useState } from 'react';
import { Button, Container, Typography, CircularProgress, Box, Divider } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { functions, auth } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const handleSteamLogin = async () => {
        setLoading(true);
        try {
            const authWithSteam = httpsCallable(functions, 'authWithSteam');
            // Expecting { url: string } in response.data
            const result = await authWithSteam();
            const data = result.data as { url: string };
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error("Error initiating login", error);
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        try {
            await signInAnonymously(auth);
            navigate('/');
        } catch (error) {
            console.error("Dev login failed", error);
            alert("Falha no login de teste.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const processLogin = async () => {
            // Check if returning from Steam (openid.mode is present)
            if (searchParams.has('openid.mode')) {
                setLoading(true);
                const params: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });

                try {
                    const validateSteamLogin = httpsCallable(functions, 'validateSteamLogin');
                    const result = await validateSteamLogin(params);
                    const data = result.data as { token: string };

                    if (data.token) {
                        await signInWithCustomToken(auth, data.token);
                        navigate('/');
                    }
                } catch (error) {
                    console.error("Login validation failed", error);
                    alert("Falha no login com a Steam.");
                } finally {
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
