import { useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db, auth } from '../firebase';

// VAPID Key do Firebase Cloud Messaging
const VAPID_KEY = "BFla3EtEi5N_XQChX5EWmOcoitBBt9Uxy_zC6VmCCMUZBw6WSN4VpRW_oUZSfu2qqeGRoPgTi8b5ynmHJ_yReO";

export function useFcmToken() {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestForToken = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log('Usuário não está logado');
                setIsLoading(false);
                return;
            }

            // Verificar se messaging está disponível
            const messagingInstance = await messaging;
            if (!messagingInstance) {
                console.log('Firebase Messaging não está disponível neste navegador');
                setIsLoading(false);
                return;
            }

            // Verificar permissão atual
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Permissão de notificação concedida');

                // Registrar service worker
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    console.log('Service Worker registrado:', registration);

                    // Aguardar o service worker estar pronto
                    await navigator.serviceWorker.ready;

                    // Obter token FCM
                    const fcmToken = await getToken(messagingInstance, {
                        vapidKey: VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (fcmToken) {
                        console.log('Token FCM obtido:', fcmToken);
                        setToken(fcmToken);

                        // Salvar token no Firestore
                        const userRef = doc(db, 'users', currentUser.uid);
                        await setDoc(userRef, { fcmToken }, { merge: true });
                        console.log('Token salvo no Firestore para usuário:', currentUser.uid);

                        // Configurar listener para mensagens em foreground
                        onMessage(messagingInstance, (payload) => {
                            console.log('Mensagem recebida em foreground:', payload);

                            // Exibir notificação customizada
                            if (Notification.permission === 'granted') {
                                new Notification(
                                    payload.notification?.title || 'GAV Protestos',
                                    {
                                        body: payload.notification?.body || 'Nova notificação',
                                        icon: '/pwa-192x192.png',
                                        badge: '/favicon-32x32.png'
                                    }
                                );
                            }
                        });
                    }
                } else {
                    console.log('Service Workers não são suportados neste navegador');
                }
            } else if (permission === 'denied') {
                console.log('Permissão de notificação negada pelo usuário');
                setError('Permissão de notificação negada');
            } else {
                console.log('Permissão de notificação não foi concedida');
            }
        } catch (err) {
            console.error('Erro ao obter token FCM:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    };

    return { token, isLoading, error, requestForToken };
}
