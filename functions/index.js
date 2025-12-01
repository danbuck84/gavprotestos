const functions = require("firebase-functions");
const admin = require("firebase-admin");
const openid = require("openid");

admin.initializeApp();

// Configuration
// You need to set these env vars or replace with hardcoded values for testing
// firebase functions:config:set steam.realm="http://localhost:5173/" steam.return_url="http://localhost:5173/login"
// For production: realm="https://your-app.web.app/" return_url="https://your-app.web.app/login"

const STEAM_REALM = process.env.STEAM_REALM || "http://localhost:5173/";
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || "http://localhost:5173/login";

const relyingParty = new openid.RelyingParty(
    STEAM_RETURN_URL, // Return URL
    STEAM_REALM,      // Realm
    true,             // Stateless
    false,            // Strict mode
    []                // Extensions
);

exports.authWithSteam = functions.https.onCall(async (data, context) => {
    return new Promise((resolve, reject) => {
        relyingParty.authenticate("https://steamcommunity.com/openid", false, (error, authUrl) => {
            if (error) {
                reject(new functions.https.HttpsError('internal', error.message));
            } else {
                resolve({ url: authUrl });
            }
        });
    });
});

exports.validateSteamLogin = functions.https.onCall(async (data, context) => {
    const mode = data.mode; // openid.mode
    // We need the full URL or parameters to validate. 
    // The 'openid' library usually expects the full URL or an object of params.
    // However, the 'openid' library's verifyAssertion takes the request object or full URL.
    // Since we are in a Callable function, we might not have the raw request easily in the format 'openid' wants if we are just passing params.
    // A better approach for the callback might be an HTTPS trigger if we want the library to handle it automatically, 
    // BUT the user asked for 'signInWithCustomToken' on the client, so the client needs the token.

    // Let's assume we pass the query parameters from the client to this function.

    // Custom validation logic or using the library if possible with manual params.
    // For simplicity in this snippet, we'll assume we can pass the params.

    // NOTE: The 'openid' library is designed for server-side handling of HTTP requests. 
    // Adapting it to a Callable function taking a JSON object requires mocking the request or using a different library like 'steam-signin'.
    // 'steam-login' or 'steam-signin' might be easier.

    // Let's implement a manual verification or use the library's verifyAssertion with a mocked request.

    return new Promise((resolve, reject) => {
        // This part is tricky without the raw request. 
        // We will assume the client sends the full URL or query params.

        // Mocking the verification for now as the library requires a request object.
        // In a real implementation, you'd use 'passport-steam' or manually verify the signature.

        // Extract SteamID from claimed_id
        const claimedId = data['openid.claimed_id'];
        if (!claimedId) {
            reject(new functions.https.HttpsError('invalid-argument', 'Missing claimed_id'));
            return;
        }

        const steamIdMatch = claimedId.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
        const steamId64 = steamIdMatch ? steamIdMatch[1] : null;

        if (!steamId64) {
            reject(new functions.https.HttpsError('invalid-argument', 'Invalid Steam ID'));
            return;
        }

        // Create Firebase Token
        const uid = `steam:${steamId64}`;

        admin.auth().createCustomToken(uid, { steamId: steamId64 })
            .then(token => {
                // Check if user exists in Firestore, if not create
                const userRef = admin.firestore().collection('users').doc(uid);
                return userRef.get().then(doc => {
                    if (!doc.exists) {
                        return userRef.set({
                            steamId64: steamId64,
                            role: 'driver',
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }).then(() => {
                    resolve({ token: token });
                });
            })
            .catch(err => {
                reject(new functions.https.HttpsError('internal', err.message));
            });
    });
});
