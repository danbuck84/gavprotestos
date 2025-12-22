const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const openid = require("openid");

admin.initializeApp();

// Configuration
// Auto-detect environment
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

const STEAM_REALM = process.env.STEAM_REALM || (isEmulator ? "http://localhost:5173/" : "https://gavprotestos.netlify.app/");
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || (isEmulator ? "http://localhost:5173/login" : "https://gavprotestos.netlify.app/login");

const relyingParty = new openid.RelyingParty(
    STEAM_RETURN_URL, // Return URL
    STEAM_REALM,      // Realm
    true,             // Stateless
    false,            // Strict mode
    []                // Extensions
);

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");

exports.authWithSteam = onCall(async (request) => {
    console.log('[authWithSteam] Initiating Steam authentication');
    console.log('[authWithSteam] Environment:', isEmulator ? 'Emulator' : 'Production');
    console.log('[authWithSteam] STEAM_REALM:', STEAM_REALM);
    console.log('[authWithSteam] STEAM_RETURN_URL:', STEAM_RETURN_URL);

    return new Promise((resolve, reject) => {
        relyingParty.authenticate("https://steamcommunity.com/openid", false, (error, authUrl) => {
            if (error) {
                console.error('[authWithSteam] Error generating auth URL:', error);
                reject(new HttpsError('internal', `Failed to generate Steam auth URL: ${error.message}`));
            } else {
                console.log('[authWithSteam] Auth URL generated successfully');
                resolve({ url: authUrl });
            }
        });
    });
});

exports.validateSteamLogin = onCall(async (request) => {
    const data = request.data;
    console.log('[validateSteamLogin] Starting validation');
    console.log('[validateSteamLogin] Received params keys:', Object.keys(data));

    return new Promise((resolve, reject) => {
        const claimedId = data['openid.claimed_id'];
        if (!claimedId) {
            console.error('[validateSteamLogin] Missing claimed_id in request');
            reject(new HttpsError('invalid-argument', 'Missing claimed_id - Invalid Steam response'));
            return;
        }

        console.log('[validateSteamLogin] Claimed ID:', claimedId);
        const steamIdMatch = claimedId.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
        const steamId64 = steamIdMatch ? steamIdMatch[1] : null;

        if (!steamId64) {
            console.error('[validateSteamLogin] Invalid Steam ID format:', claimedId);
            reject(new HttpsError('invalid-argument', 'Invalid Steam ID format'));
            return;
        }

        console.log('[validateSteamLogin] Extracted Steam ID64:', steamId64);
        const uid = `steam:${steamId64}`;

        admin.auth().createCustomToken(uid, { steamId: steamId64 })
            .then(token => {
                console.log('[validateSteamLogin] Custom token created for:', uid);
                const userRef = admin.firestore().collection('users').doc(uid);
                return userRef.get().then(doc => {
                    if (!doc.exists) {
                        console.log('[validateSteamLogin] Creating new user document');
                        return userRef.set({
                            steamId64: steamId64,
                            role: 'driver',
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        console.log('[validateSteamLogin] User document already exists');
                    }
                }).then(() => {
                    console.log('[validateSteamLogin] Validation successful, returning token');
                    resolve({ token: token });
                });
            })
            .catch(err => {
                console.error('[validateSteamLogin] Error creating token or user:', err);
                reject(new HttpsError('internal', `Authentication failed: ${err.message}`));
            });
    });
});

// --- Notification System & Background Tasks ---

const nodemailer = require('nodemailer');

// Configure Nodemailer (You need to set these env vars)
// firebase functions:config:set email.service="gmail" email.user="your@gmail.com" email.pass="yourpassword"
let emailConfig = {};
try {
    emailConfig = functions.config().email || {};
} catch (e) {
    console.warn("Functions config not available locally.");
}

const mailTransport = nodemailer.createTransport({
    service: emailConfig.service || 'gmail',
    auth: {
        user: emailConfig.user || 'user@example.com',
        pass: emailConfig.pass || 'password',
    },
});

// Helper: Create In-App Notification
async function createNotification(userId, title, message, link = null) {
    try {
        await admin.firestore().collection('users').doc(userId).collection('notifications').add({
            title,
            message,
            link,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error(`Error creating notification for ${userId}:`, error);
    }
}

// Helper: Send Email
async function sendEmail(email, subject, text) {
    if (!email) return;
    try {
        await mailTransport.sendMail({
            from: '"GAV Protestos" <noreply@gavprotestos.com>',
            to: email,
            subject: subject,
            text: text,
        });
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// --- PUSH NOTIFICATIONS (FCM) ---

const db = admin.firestore();

// Helper: Get all admin FCM tokens
async function getAdminTokens() {
    const snapshot = await db.collection('users')
        .where('role', 'in', ['admin', 'super-admin'])
        .get();

    return snapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token); // Remove nulls/undefined
}

// Helper: Get all driver FCM tokens
async function getAllDriverTokens() {
    const snapshot = await db.collection('users')
        .where('role', '==', 'driver')
        .get();

    return snapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token);
}

// Helper: Send push notification in batches (FCM limit: 500 tokens per request)
async function sendPushNotification(tokens, notification, data = {}) {
    if (!tokens || tokens.length === 0) {
        console.log('No tokens to send notifications to');
        return;
    }

    console.log(`Sending push notifications to ${tokens.length} devices`);

    // FCM limits to 500 tokens per multicast request
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        const message = {
            tokens: batch,
            notification,
            data,
            android: {
                priority: 'high'
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        try {
            const response = await admin.messaging().sendMulticast(message);
            console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);

            // Log failed tokens for cleanup (future improvement)
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`Failed to send to token ${batch[idx].substring(0, 20)}...: ${resp.error}`);
                    }
                });
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
}


// 1. Scheduled Function: Check Deadlines with Push Notifications (Every 15 mins)
exports.checkDeadlines = onSchedule("every 15 minutes", async (event) => {
    const now = Date.now();
    console.log(`[checkDeadlines] Running at ${new Date(now).toISOString()}`);

    // === TASK A: 1h Before Protest Deadline (23h after race) ===
    // Look for races that happened between 22h45min and 23h15min ago
    const twentyThreeHoursAgo = now - (23 * 60 * 60 * 1000);
    const buffer = 15 * 60 * 1000; // 15 minutes buffer

    const protestWarningSnapshot = await db.collection('races')
        .where('date', '>=', new Date(twentyThreeHoursAgo - buffer).toISOString())
        .where('date', '<=', new Date(twentyThreeHoursAgo + buffer).toISOString())
        .get();

    for (const raceDoc of protestWarningSnapshot.docs) {
        const race = raceDoc.data();

        // Check if already notified
        if (race.notifiedProtestWarning) {
            continue;
        }

        console.log(`[checkDeadlines] Protest warning for race ${raceDoc.id}`);

        try {
            // Get all driver tokens
            const driverTokens = await getAllDriverTokens();

            if (driverTokens.length > 0) {
                await sendPushNotification(
                    driverTokens,
                    {
                        title: 'Atenção: Prazo de protestos encerrando',
                        body: 'Falta 1 hora para encerrar o envio de protestos!'
                    },
                    {
                        raceId: raceDoc.id,
                        type: 'protest_deadline_warning'
                    }
                );
            }

            // Also create in-app notifications for drivers
            const driversSnapshot = await db.collection('users').where('role', '==', 'driver').get();
            for (const driverDoc of driversSnapshot.docs) {
                await createNotification(
                    driverDoc.id,
                    'Prazo de Protesto Encerrando',
                    `Falta 1 hora para encerrar o prazo de protestos da etapa ${race.eventName || race.trackName}.`,
                    `/novo-protesto`
                );
            }

            // Mark as notified
            await raceDoc.ref.update({ notifiedProtestWarning: true });
        } catch (error) {
            console.error(`[checkDeadlines] Error in protest warning for race ${raceDoc.id}:`, error);
        }
    }

    // === TASK B: Voting Opens (24h after race - protest deadline) ===
    // Look for races that happened between 23h45min and 24h15min ago
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    const votingOpenSnapshot = await db.collection('races')
        .where('date', '>=', new Date(twentyFourHoursAgo - buffer).toISOString())
        .where('date', '<=', new Date(twentyFourHoursAgo + buffer).toISOString())
        .get();

    for (const raceDoc of votingOpenSnapshot.docs) {
        const race = raceDoc.data();

        // Check if already notified
        if (race.notifiedVotingOpen) {
            continue;
        }

        console.log(`[checkDeadlines] Voting open for race ${raceDoc.id}`);

        try {
            // Get admin tokens
            const adminTokens = await getAdminTokens();

            if (adminTokens.length > 0) {
                await sendPushNotification(
                    adminTokens,
                    {
                        title: 'Fase de protestos encerrada',
                        body: 'A votação está aberta.'
                    },
                    {
                        raceId: raceDoc.id,
                        type: 'voting_open'
                    }
                );
            }

            // Also create in-app notifications for admins
            const adminsSnapshot = await db.collection('users').where('role', 'in', ['admin', 'super-admin']).get();
            for (const adminDoc of adminsSnapshot.docs) {
                await createNotification(
                    adminDoc.id,
                    'Votação Aberta',
                    `A votação dos protestos da etapa ${race.eventName || race.trackName} está aberta.`,
                    `/admin`
                );
            }

            // Mark as notified
            await raceDoc.ref.update({ notifiedVotingOpen: true });
        } catch (error) {
            console.error(`[checkDeadlines] Error in voting open for race ${raceDoc.id}:`, error);
        }
    }

    // === TASK C: 1h Before Voting Deadline (47h after race) ===
    // Look for races that happened between 46h45min and 47h15min ago
    const fortySevenHoursAgo = now - (47 * 60 * 60 * 1000);

    const votingWarningSnapshot = await db.collection('races')
        .where('date', '>=', new Date(fortySevenHoursAgo - buffer).toISOString())
        .where('date', '<=', new Date(fortySevenHoursAgo + buffer).toISOString())
        .get();

    for (const raceDoc of votingWarningSnapshot.docs) {
        const race = raceDoc.data();

        // Check if already notified
        if (race.notifiedVotingWarning) {
            continue;
        }

        // Check if there are protests pending for this race
        const protestsSnapshot = await db.collection('protests')
            .where('raceId', '==', raceDoc.id)
            .where('status', '==', 'under_review')
            .get();

        if (protestsSnapshot.empty) {
            // No pending protests, skip
            await raceDoc.ref.update({ notifiedVotingWarning: true });
            continue;
        }

        console.log(`[checkDeadlines] Voting warning for race ${raceDoc.id}`);

        try {
            // Get admin tokens
            const adminTokens = await getAdminTokens();

            if (adminTokens.length > 0) {
                await sendPushNotification(
                    adminTokens,
                    {
                        title: 'Urgente: Votação encerrando',
                        body: '1 hora restante para finalizar as votações.'
                    },
                    {
                        raceId: raceDoc.id,
                        type: 'voting_deadline_warning'
                    }
                );
            }

            // Also create in-app notifications
            const adminsSnapshot = await db.collection('users').where('role', 'in', ['admin', 'super-admin']).get();
            for (const adminDoc of adminsSnapshot.docs) {
                await createNotification(
                    adminDoc.id,
                    'Votação Encerrando',
                    `Falta 1 hora para encerrar a votação dos protestos da etapa ${race.eventName || race.trackName}.`,
                    `/admin`
                );
            }

            // Mark as notified
            await raceDoc.ref.update({ notifiedVotingWarning: true });
        } catch (error) {
            console.error(`[checkDeadlines] Error in voting warning for race ${raceDoc.id}:`, error);
        }
    }

    console.log('[checkDeadlines] Completed successfully');
});


// 2. Trigger: New Protest -> Notify Admins
exports.onProtestCreated = onDocumentCreated("protests/{protestId}", async (event) => {
    const protest = event.data.data();
    const adminsSnapshot = await db.collection('users').where('role', 'in', ['admin', 'super-admin']).get();

    adminsSnapshot.forEach(adminDoc => {
        createNotification(
            adminDoc.id,
            'Novo Protesto Registrado',
            `Novo protesto na ${protest.heat}. Acusador: ${protest.accuserId}.`,
            `/admin/julgamento/${event.params.protestId}`
        );
    });
});

// 3. Trigger: New Race Created -> Notify All Drivers with Push Notification
exports.onRaceCreated = onDocumentCreated("races/{raceId}", async (event) => {
    const race = event.data.data();
    const raceId = event.params.raceId;

    console.log(`[onRaceCreated] New race created: ${raceId}`);

    try {
        // Get all driver tokens
        const driverTokens = await getAllDriverTokens();

        // Get all admin tokens
        const adminTokens = await getAdminTokens();

        // Combine both arrays and remove duplicates (in case user has both roles)
        const allTokens = [...new Set([...driverTokens, ...adminTokens])];

        if (allTokens.length === 0) {
            console.log('[onRaceCreated] No tokens found (drivers or admins)');
            return;
        }

        // Send push notification to everyone
        await sendPushNotification(
            allTokens,
            {
                title: 'Nova etapa disponível!',
                body: 'O envio de protestos está aberto.'
            },
            {
                raceId: raceId,
                type: 'new_race',
                eventName: race.eventName || race.trackName || 'Nova corrida'
            }
        );

        console.log(`[onRaceCreated] Push notifications sent to ${allTokens.length} users (${driverTokens.length} drivers + ${adminTokens.length} admins)`);
    } catch (error) {
        console.error('[onRaceCreated] Error sending notifications:', error);
    }
});


// 3. Trigger: Cleanup Videos on Conclusion + Notify Parties
exports.onProtestConcluded = onDocumentUpdated("protests/{protestId}", async (event) => {
    const newData = event.data.after.data();
    const previousData = event.data.before.data();

    // Check if status changed to 'concluded'
    if (newData.status === 'concluded' && previousData.status !== 'concluded') {
        const protestId = event.params.protestId;
        console.log(`[onProtestConcluded] Protest ${protestId} concluded`);

        // --- PUSH NOTIFICATIONS ---
        try {
            // Get race information for better message
            const raceDoc = await db.collection('races').doc(newData.raceId).get();
            const race = raceDoc.exists ? raceDoc.data() : {};
            const eventName = race.eventName || race.trackName || 'uma corrida';

            // Get tokens for accuser and accused
            const tokens = [];

            // Get accuser token
            const accuserDoc = await db.collection('users').doc(newData.accuserId).get();
            if (accuserDoc.exists && accuserDoc.data().fcmToken) {
                tokens.push(accuserDoc.data().fcmToken);
            }

            // Get accused token
            const accusedDoc = await db.collection('users').doc(newData.accusedId).get();
            if (accusedDoc.exists && accusedDoc.data().fcmToken) {
                tokens.push(accusedDoc.data().fcmToken);
            }

            if (tokens.length > 0) {
                await sendPushNotification(
                    tokens,
                    {
                        title: 'Saiu o veredito do seu protesto',
                        body: `Saiu o veredito do seu protesto na etapa ${eventName}. Toque para ver.`
                    },
                    {
                        protestId: protestId,
                        raceId: newData.raceId,
                        type: 'protest_concluded'
                    }
                );
                console.log(`[onProtestConcluded] Push notifications sent to ${tokens.length} users`);
            }
        } catch (error) {
            console.error('[onProtestConcluded] Error sending push notifications:', error);
        }

        // --- VIDEO CLEANUP ---
        const videoUrls = newData.videoUrls || [];
        if (videoUrls.length === 0) return;

        const bucket = admin.storage().bucket();

        const deletePromises = videoUrls.map(async (url) => {
            try {
                // Extract file path from URL
                // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?token=...
                // We need to decode the path.
                const matches = url.match(/\/o\/(.+)\?/);
                if (matches && matches[1]) {
                    const filePath = decodeURIComponent(matches[1]);
                    await bucket.file(filePath).delete();
                    console.log(`Deleted video: ${filePath}`);
                }
            } catch (error) {
                console.error('Error deleting video:', error);
            }
        });

        await Promise.all(deletePromises);

        // Optionally update doc to say videos are deleted?
        // await change.after.ref.update({ videosDeleted: true });
    }
});
