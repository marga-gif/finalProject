import {
  getCollection,
  addRecord,
  updateRecord,
  getRecordById,
} from "../services/firestoreService.js";
import { logAudit } from "../middleware/audit.js";

const DOCUMENT_CATEGORIES = {
  CERTIFICATES: [
    "Barangay Certificate",
    "Certificate of Indigency",
    "Certificate of Residency",
    "Certificate of Good Moral Character",
    "Voter's Certificate (Barangay Copy)",
    "First-Time Job Seeker Certificate (RA 11261)",
    "Solo Parent / Senior Citizen Local Certification",
    "Certificate of Cohabitation",
    "Birth / Marriage / Baptismal Certification Support",
  ],
  "BARANGAY DOCUMENTS": [
    "Community Tax Certificate (Cedula)",
    "Barangay Clearance",
    "Philhealth MDR Form Request",
    "Barangay ID Request",
    "Barangay Blotter / Incident Report Copy",
    "Katarungang Pambarangay Mediation / Legal Endorsement",
    "Barangay Protection Order (BPO)",
    "Certificate of No Objection",
  ],
  LICENSES: [
    "Barangay Business Clearance / Permit",
    "Locational Clearance",
    "Building / Excavation Clearance",
    "Tricycle / Pedicab Operator's Clearance",
    "Working / Local Employment Clearance",
  ],
  "FINANCIAL SUPPORTS": [
    "Doctor's Prescription & Free Maintenance Medicine",
    "AICS (Crisis Assistance) Endorsement / Referral",
    "Educational Assistance & SK Scholarships",
    "Medical, Burial, and Emergency Cash Aid Referrals",
    "Senior Citizen Cash Gift & Local Benefits Coordination",
    "Livelihood Training & SK Skills Seminars",
    "Emergency Relief Operations & Feeding Programs",
  ],
};

export async function getDocumentCategories(req, res) {
  res.json(DOCUMENT_CATEGORIES);
}

export async function getDocumentRequests(req, res) {
  let requests = await getCollection("documentRequests");

  if (req.user.role === "user") {
    requests = requests.filter((item) => item.userId === req.user.uid);
  }

  res.json(requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
}

export async function submitDocumentRequest(req, res) {
  const { documentType, category, purpose, notes } = req.body;

  if (!documentType || !category) {
    return res.status(400).json({ error: "Document type and category are required." });
  }

  const requestId = `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const request = await addRecord("documentRequests", {
    requestId,
    userId: req.user.uid,
    citizenName: req.user.fullName,
    citizenEmail: req.user.email,
    documentType,
    category,
    purpose: purpose || "",
    notes: notes || "",
    dateSubmitted: new Date().toISOString().slice(0, 10),
    status: "Pending Review",
    requestCategory: "government",
  });

  await logAudit(req, "DOCUMENT_REQUEST_SUBMITTED", { requestId: request.id });
  res.status(201).json(request);
}

export async function updateDocumentRequest(req, res) {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const allowed = [
    "Pending Review",
    "Processing",
    "Ready for Pickup",
    "Completed",
    "Rejected",
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const existing = await getRecordById("documentRequests", id);
  if (!existing) {
    return res.status(404).json({ error: "Request not found." });
  }

  const updated = await updateRecord("documentRequests", id, {
    status,
    adminNotes: adminNotes || "",
  });

  await logAudit(req, "DOCUMENT_REQUEST_UPDATED", { requestId: id, status });
  res.json(updated);
}

export async function searchDocuments(req, res) {
  const query = (req.query.q || "").toLowerCase().trim();
  if (!query) {
    return res.json({ results: [] });
  }

  const results = [];
  for (const [category, items] of Object.entries(DOCUMENT_CATEGORIES)) {
    items.forEach((item) => {
      if (item.toLowerCase().includes(query)) {
        results.push({ category, item });
      }
    });
  }

  res.json({ results });
}
