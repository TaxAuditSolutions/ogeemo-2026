import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";

dotenv.config({ path: ".env.local" });

// Restores the two Secret Manager versions the SSR function mounts
// (SERVICE_ACCOUNT_KEY + GEMINI_API_KEY) — both were found DISABLED, which
// blocked the Cloud Run revision from starting.
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ogeemo-firebase";
const SECRETS = ["SERVICE_ACCOUNT_KEY", "GEMINI_API_KEY"];
const RESULTS_FILE = path.join(process.env.TEMP || ".", "secret-enable-results.log");
fs.writeFileSync(RESULTS_FILE, `=== secret enable started ${new Date().toISOString()} ===\n`);

function append(line: string) {
    console.log(line);
    fs.appendFileSync(RESULTS_FILE, line + "\n");
}

async function main() {
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
        append("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
        process.exitCode = 1;
        return;
    }
    let cleanKey = keyJson.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) cleanKey = cleanKey.slice(1, -1);
    else if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) cleanKey = cleanKey.slice(1, -1);
    const serviceAccount = JSON.parse(cleanKey);
    if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    append(`Service account project: ${serviceAccount.project_id}`);

    // google-auth-library needs the key as a file.
    const keyPath = path.join(process.env.TEMP || ".", "sa-enable-temp.json");
    fs.writeFileSync(keyPath, JSON.stringify(serviceAccount));

    const auth = new GoogleAuth({ keyFile: keyPath, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Failed to obtain access token");
    append("Access token obtained (cloud-platform scope)");

    for (const secret of SECRETS) {
        const versionUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${secret}/versions/1`;
        const patchRes = await fetch(versionUrl, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ state: "ENABLED" }),
        });
        const patchBody = await patchRes.text();
        append(`${secret}/versions/1 enable => HTTP ${patchRes.status} ${patchRes.status === 200 ? "ENABLED" : patchBody.slice(0, 160)}`);
    }

    append("--- verify ---");
    for (const secret of SECRETS) {
        const versionUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${secret}/versions/1`;
        const res = await fetch(versionUrl, { headers: { Authorization: `Bearer ${token.token}` } });
        const body = await res.json().catch(() => ({}));
        append(`${secret}/versions/1 state => ${body.state || `HTTP ${res.status}`}`);
    }
    fs.unlinkSync(keyPath);
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});