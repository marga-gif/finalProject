import { addRecord } from "../services/firestoreService.js";

export async function logAudit(req, action, details = {}) {
  try {
    await addRecord("auditLogs", {
      action,
      actorUid: req.user?.uid || "anonymous",
      actorEmail: req.user?.email || "",
      actorRole: req.user?.role || "guest",
      path: req.originalUrl,
      method: req.method,
      details,
      ip: req.ip,
    });
  } catch {
    // Audit logging should not block main requests.
  }
}
