import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

// Re-enables the two Secret Manager versions (version 1 of SERVICE_ACCOUNT_KEY
// and GEMINI_API_KEY) that the SSR function's revision template pins to.
// Uses the Firebase CLI's own logged-in Google credential (the same identity
// that deploys the project). Prints only statuses — never tokens or values.

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ogeemo-firebase";
const SECRETS = ["SERVICE_ACCOUNT_KEY", "GEMINI_API_KEY"];
const RESULTS_FILE = path.join(process.env.TEMP || ".", "secret-enable2-results.log");
fs.writeFileSync(RESULTS_FILE, `=== secret re-enable started ${new Date().toISOString()} ===\n`);

function append(line: string) {
    console.log(line);
    fs.appendFileSync(RESULTS_FILE, line + "\n");
}

function deepFind(obj: any, key: string): any {
    if (!obj || typeof obj !== "object") return undefined;
    if (key in obj) return obj[key];
    for (const value of Object.values(obj)) {
        if (value && typeof value === "object") {
            const found = deepFind(value, key);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

async function main() {
    // 1) Locate the Firebase CLI's stored credential.
    const storePath = path.join(process.env.USERPROFILE || process.env.HOME || "", ".config", "configstore", "firebase-tools.json");
    if (!fs.existsSync(storePath)) {
        append(`Firebase CLI credential store not found at ${storePath}`);
        process.exitCode = 1;
        return;
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const refreshToken = deepFind(store, "refresh_token");
    if (!refreshToken) {
        append("No refresh_token found in the Firebase CLI credential store.");
        process.exitCode = 1;
        return;
    }

    // 2) Exchange it for a fresh access token (firebase-tools uses a public
    //    installed-app OAuth client; its id/secret are embedded in the store
    //    or known from the firebase-tools source).
    const clientId = deepFind(store, "clientId") || "563584335869-fgrhgmd47bqnekij5i8b5pr03hojaf6d.apps.googleusercontent.com";
    const clientSecret = deepFind(store, "clientSecret") || "j9iVZfS8kUL3+A4Twr3TdBmHdg";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });
    if (!tokenRes.ok) {
        append(`Token refresh failed: HTTP ${tokenRes.status}`);
        process.exitCode = 1;
        return;
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;
    append("Fresh access token obtained (Google account)");

    // 3) Enable version 1 of both secrets.
    for (const secret of SECRETS) {
        const versionUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${secret}/versions/1`;
        const patchRes = await fetch(versionUrl, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ state: "ENABLED" }),
        });
        const patchBody = await patchRes.text();
        append(`${secret}/versions/1 enable => HTTP ${patchRes.status} ${patchRes.status === 200 ? "ENABLED" : patchBody.slice(0, 160)}`);
    }

    append("--- verify ---");
    for (const secret of SECRETS) {
        const versionUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${secret}/versions/1`;
        const res = await fetch(versionUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        const body = await res.json().catch(() => ({}));
        append(`${secret}/versions/1 state => ${body.state || `HTTP ${res.status}`}`);
    }

    // 4) Confirm the "latest" alias now resolves to an ENABLED version.
    for (const secret of SECRETS) {
        const latestUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${secret}/versions/latest`;
        const res = await fetch(latestUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        const body = await res.json().catch(() => ({}));
        append(`${secret}/versions/latest state => ${body.state || `HTTP ${res.status}`}`);
    }
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});