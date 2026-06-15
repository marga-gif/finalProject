import admin from "firebase-admin";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

let db = null;
let auth = null;
let initialized = false;

function parseServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      console.warn("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.");
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    try {
      return JSON.parse(readFileSync(credPath, "utf8"));
    } catch (err) {
      console.warn("Could not read GOOGLE_APPLICATION_CREDENTIALS:", err.message);
    }
  }

  return null;
}

try {
  if (!admin.apps.length) {
    const serviceAccount = parseServiceAccount();

    if (serviceAccount?.project_id) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      console.warn(
        "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID."
      );
    }
  }

  if (admin.apps.length) {
    db = admin.firestore();
    auth = admin.auth();
    initialized = true;
  }
} catch (err) {
  console.warn("Firebase Admin initialization failed:", err.message);
}

export { admin, db, auth, initialized as isFirebaseReady };
