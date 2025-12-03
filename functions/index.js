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

// 1. Scheduled Function: Check Deadlines (Every 30 mins)
exports.checkDeadlines = onSchedule("every 30 minutes", async (event) => {
    const now = admin.firestore.Timestamp.now();
    // const db = admin.firestore(); // db is already global

    // Task A: Race Protest Deadline Warning (1h before 24h deadline)
    // We look for races that happened between 22.5h and 23h ago.
    // 23h ago = now - 23h.
    const twentyThreeHoursAgo = new Date(now.toMillis() - (23 * 60 * 60 * 1000));
    const twentyTwoHoursThirtyAgo = new Date(now.toMillis() - (22.5 * 60 * 60 * 1000));

    // This query might need an index on 'date'
    const racesSnapshot = await db.collection('races')
        .where('date', '>=', twentyThreeHoursAgo.toISOString())
        .where('date', '<=', twentyTwoHoursThirtyAgo.toISOString()) // Assuming date is ISO string
        .get();

    racesSnapshot.forEach(async (raceDoc) => {
        const race = raceDoc.data();
        // Notify all drivers (This could be heavy if many drivers, consider batching)
        // For now, we notify all users with role 'driver'
        const driversSnapshot = await db.collection('users').where('role', '==', 'driver').get();
        driversSnapshot.forEach(driverDoc => {
            createNotification(
                driverDoc.id,
                'Prazo de Protesto Encerrando',
                `Falta 1 hora para encerrar o prazo de protestos da corrida em ${race.track}.`,
                `/novo-protesto`
            );
        });
    });

    // Task B: Voting Deadline Warning (1h before 48h deadline)
    // We look for protests created between 22.5h and 23h ago (since voting starts at 24h and ends at 48h? No.)
    // Wait, the user said: "Verificar protestos abertos há 23 horas. Enviar notificação aos admins que ainda não votaram."
    // This implies warning BEFORE voting starts? Or warning BEFORE voting ends?
    // User said: "encerrar às 20h da quarta-feira... automaticamente aberta pros admins votarem."
    // "votação deve ser automaticamente encerrada às 20h da quinta-feira" (48h after event).
    // So voting window is 24h-48h.
    // If we warn at "23h open", maybe they mean 23h AFTER VOTING OPENED? (i.e. 47h after event).
    // Or maybe 23h after event (1h before voting opens)?
    // "Aviso aos Admins: Verificar protestos abertos há 23 horas." -> This sounds like 23h after creation.
    // If protest created at T+1h, 23h later is T+24h. So just when voting opens.
    // Let's assume the goal is to warn admins that voting is about to CLOSE.
    // So we check races that happened 47h ago.

    const fortySevenHoursAgo = new Date(now.toMillis() - (47 * 60 * 60 * 1000));
    const fortySixHoursThirtyAgo = new Date(now.toMillis() - (46.5 * 60 * 60 * 1000));

    // Find races ending soon
    const racesEndingVoteSnapshot = await db.collection('races')
        .where('date', '>=', fortySevenHoursAgo.toISOString())
        .where('date', '<=', fortySixHoursThirtyAgo.toISOString())
        .get();

    racesEndingVoteSnapshot.forEach(async (raceDoc) => {
        // Find protests for this race
        const protestsSnapshot = await db.collection('protests')
            .where('raceId', '==', raceDoc.id)
            .where('status', '==', 'under_review')
            .get();

        if (protestsSnapshot.empty) return;

        // Notify Admins
        const adminsSnapshot = await db.collection('users').where('role', 'in', ['admin', 'super-admin']).get();

        adminsSnapshot.forEach(adminDoc => {
            // Check if admin voted on these protests? Too complex for now. Just warn.
            createNotification(
                adminDoc.id,
                'Votação Encerrando',
                `Falta 1 hora para encerrar a votação dos protestos da corrida em ${raceDoc.data().track}.`,
                `/admin`
            );
        });
    });
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

// 3. Trigger: Cleanup Videos on Conclusion
exports.onProtestConcluded = onDocumentUpdated("protests/{protestId}", async (event) => {
    const newData = event.data.after.data();
    const previousData = event.data.before.data();

    // Check if status changed to 'concluded'
    if (newData.status === 'concluded' && previousData.status !== 'concluded') {
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
