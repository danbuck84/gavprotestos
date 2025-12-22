// Service Worker para Firebase Cloud Messaging
// Gerencia notificações em background quando o app está fechado

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do Firebase (mesma do app)
const firebaseConfig = {
    apiKey: "AIzaSyBGXBb3VmPvwwJ8dT6xXfUWNqyc_w8qm-0",
    authDomain: "gavprotestos.firebaseapp.com",
    projectId: "gavprotestos",
    storageBucket: "gavprotestos.firebasestorage.app",
    messagingSenderId: "760658663626",
    appId: "1:760658663626:web:4e5a0c0e5f5e1e1e1e1e1e"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter instância do messaging
const messaging = firebase.messaging();

// Handler para mensagens recebidas em background
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificação recebida em background:', payload);

    const notificationTitle = payload.notification?.title || 'GAV Protestos';
    const notificationOptions = {
        body: payload.notification?.body || 'Você tem uma nova notificação',
        icon: '/pwa-192x192.png',
        badge: '/favicon-32x32.png',
        tag: payload.data?.protestId || 'default',
        requireInteraction: true,
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Clique na notificação:', event);

    event.notification.close();

    // Abrir ou focar na janela do app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se já existe uma janela aberta, focar nela
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Caso contrário, abrir nova janela
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
