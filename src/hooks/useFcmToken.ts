import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db, auth } from '../firebase';

export function useFcmToken() {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listener PERSISTENTE para mensagens em foreground
    // (sempre ativo, mesmo após reloads)
    useEffect(() => {
        const setupForegroundListener = async () => {
            const messagingInstance = await messaging;
            if (!messagingInstance) {
                console.log('[Foreground Listener] Messaging não disponível');
                return;
            }

            console.log('[Foreground Listener] Configurando listener de mensagens...');

            const unsubscribe = onMessage(messagingInstance, (payload) => {
                console.log('📬 Mensagem recebida em FOREGROUND:', payload);

                const title = payload.notification?.title || 'GAV Protestos';
                const body = payload.notification?.body || 'Nova notificação';

                // Exibir notificação nativa do navegador
                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: '/pwa-192x192.png',
                        badge: '/favicon-32x32.png',
                        tag: payload.data?.raceId || 'notification',
                        requireInteraction: false
                    });
                }

                // ALERT visual para garantir visibilidade
                alert(`🔔 ${title}\n\n${body}`);
            });

            return unsubscribe;
        };

        setupForegroundListener();
    }, []); // Apenas uma vez na montagem


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


                    // VAPID Key validada
                    const validKey = 'BFIs3EtEi5N_XGChXSEWm0coitBBt9UXyUzC6VmCCMUZBwSWSN4VpRW_oUZSfu2qqelGRoPgTi8b5ynsHU_yRe0';
                    console.log('Using Vapid Key:', validKey);

                    let fcmToken: string | null = null;

                    // Tentar obter token FCM com retry automático em caso de subscription órfã
                    try {
                        fcmToken = await getToken(messagingInstance, {
                            vapidKey: validKey,
                            serviceWorkerRegistration: registration
                        });
                    } catch (tokenError: any) {
                        console.warn('Erro ao obter token FCM (primeira tentativa):', tokenError);

                        // Se o erro for relacionado à VAPID key inválida, limpar subscription órfã e tentar novamente
                        if (tokenError?.message?.toLowerCase().includes('valid') ||
                            tokenError?.message?.toLowerCase().includes('applicationserverkey')) {
                            console.log('🔄 Detectada subscription órfã. Limpando e tentando novamente...');

                            try {
                                // Obter subscription atual
                                const subscription = await registration.pushManager.getSubscription();

                                if (subscription) {
                                    console.log('📌 Removendo subscription antiga:', subscription.endpoint.substring(0, 50) + '...');
                                    await subscription.unsubscribe();
                                    console.log('✅ Subscription antiga removida com sucesso');
                                }

                                // Tentar obter token novamente após limpeza
                                console.log('🔄 Tentando obter token FCM novamente...');
                                fcmToken = await getToken(messagingInstance, {
                                    vapidKey: validKey,
                                    serviceWorkerRegistration: registration
                                });
                                console.log('✅ Token FCM obtido com sucesso após retry');
                            } catch (retryError) {
                                console.error('❌ Erro mesmo após limpeza de subscription:', retryError);
                                throw retryError;
                            }
                        } else {
                            throw tokenError;
                        }
                    }

                    if (fcmToken) {
                        console.log('Token FCM obtido:', fcmToken);
                        setToken(fcmToken);


                        // Salvar token no Firestore
                        const userRef = doc(db, 'users', currentUser.uid);
                        await setDoc(userRef, { fcmToken }, { merge: true });
                        console.log('Token salvo no Firestore para usuário:', currentUser.uid);

                        // Listener de foreground agora está no useEffect separado (linhas 10-47)
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
