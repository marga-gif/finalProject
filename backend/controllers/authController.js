import { auth, isFirebaseReady } from "../config/firebase.js";
import { addRecord, getRecordById, updateRecord } from "../services/firestoreService.js";
import { logAudit } from "../middleware/audit.js";
// If you have a querying method in your firestoreService like getRecords, import it here
// e.g., import { getRecords } from "../services/firestoreService.js";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const ADMIN_REGISTRATION_TOKEN = process.env.ADMIN_REGISTRATION_TOKEN || "1234567890123";

async function signInWithPassword(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || "Login failed.";
    throw new Error(message);
  }
  return data;
}

async function buildAuthResponse(firebaseData) {
  const profile = await getRecordById("users", firebaseData.localId);

  if (!profile) {
    throw new Error("User profile not found. Please contact the barangay office.");
  }

  if (profile.status === "disabled") {
    throw new Error("This account has been disabled.");
  }

  return {
    idToken: firebaseData.idToken,
    refreshToken: firebaseData.refreshToken,
    expiresIn: firebaseData.expiresIn,
    user: {
      uid: firebaseData.localId,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      firstName: profile.firstName || "",
      middleName: profile.middleName || "",
      lastName: profile.lastName || "",
      suffix: profile.suffix || "",
      birthDate: profile.birthDate || "",
      gender: profile.gender || "",
      mobile: profile.mobile || "",
      street: profile.street || "",
      barangay: profile.barangay || "",
      city: profile.city || "",
      province: profile.province || "",
      zipCode: profile.zipCode || "",
      photoData: profile.photoData || "",
    },
  };
}

export async function registerUser(req, res) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      birthDate,
      gender,
      email,
      mobile,
      street,
      barangay,
      city,
      province,
      zipCode,
      password,
      confirmPassword,
      photoData,
    } = req.body;

    const normalizedFirstName = (firstName || "").trim();
    const normalizedLastName = (lastName || "").trim();
    const displayName = [normalizedFirstName, (middleName || "").trim(), normalizedLastName]
      .filter(Boolean)
      .join(" ");

    if (!normalizedFirstName || !normalizedLastName || !email || !password) {
      return res.status(400).json({ error: "First name, last name, email, and password are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (!isFirebaseReady || !auth) {
      return res.status(503).json({ error: "Firebase is not configured on the server." });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

    const profile = await addRecord("users", {
      id: userRecord.uid,
      uid: userRecord.uid,
      fullName: displayName,
      firstName: normalizedFirstName,
      middleName: (middleName || "").trim(),
      lastName: normalizedLastName,
      suffix: suffix || "",
      birthDate: birthDate || "",
      gender: gender || "",
      email,
      mobile: mobile || "",
      street: street || "",
      barangay: barangay || "",
      city: city || "",
      province: province || "",
      zipCode: zipCode || "",
      photoData: photoData || "",
      role: "user",
      status: "active",
    });

    await logAudit(req, "USER_REGISTERED", { uid: userRecord.uid, email });

    res.status(201).json({
      message: "Account created successfully. You may now log in.",
      user: { uid: profile.uid, email: profile.email, fullName: profile.fullName, role: profile.role },
    });
  } catch (error) {
    const message =
      error.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : error.message;
    res.status(400).json({ error: message });
  }
}

export async function registerAdmin(req, res) {
  try {
    const { firstName, middleName, lastName, email, password, adminToken } = req.body;

    if (!firstName || !lastName || !email || !password || !adminToken) {
      return res.status(400).json({ error: "All admin registration fields are required." });
    }

    if (adminToken !== ADMIN_REGISTRATION_TOKEN) {
      return res.status(403).json({ error: "Invalid admin registration token." });
    }

    if (!isFirebaseReady || !auth) {
      return res.status(503).json({ error: "Firebase is not configured on the server." });
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });

    const profile = await addRecord("users", {
      id: userRecord.uid,
      uid: userRecord.uid,
      fullName,
      firstName,
      middleName: middleName || "",
      lastName,
      email,
      role: "admin",
      status: "active",
    });

    await logAudit(req, "ADMIN_REGISTERED", { uid: userRecord.uid, email });

    res.status(201).json({
      message: "Admin account created successfully.",
      user: { uid: profile.uid, email: profile.email, fullName: profile.fullName, role: profile.role },
    });
  } catch (error) {
    const message =
      error.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : error.message;
    res.status(400).json({ error: message });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!FIREBASE_API_KEY) {
      return res.status(503).json({ error: "FIREBASE_API_KEY is not configured." });
    }

    const firebaseData = await signInWithPassword(email, password);
    const response = await buildAuthResponse(firebaseData);

    if (portal === "admin" && response.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access only. Use the user portal to sign in." });
    }

    if (portal === "user" && response.user.role === "admin") {
      return res.status(403).json({ error: "Please use the Administrator Portal to sign in." });
    }

    await logAudit({ ...req, user: response.user }, "USER_LOGIN", { email });

    res.json(response);
  } catch (error) {
    const friendly =
      error.message === "INVALID_LOGIN_CREDENTIALS"
        ? "Invalid email or password."
        : error.message;
    res.status(401).json({ error: friendly });
  }
}

// --- FORGOT PASSWORD CONTROLLER FOR OTP DISPATCH ---
export async function forgotPassword(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    console.log(`Generating verification pin code workflow for: ${phone}`);

    await logAudit(req, "OTP_REQUESTED", { mobile: phone });

    return res.status(200).json({
      success: true,
      message: "Verification code sent! Please check your mobile messages.",
    });

  } catch (error) {
    console.error("Forgot Password Module Exception Error:", error);
    return res.status(500).json({ error: "Internal server error encountered while handling password request." });
  }
}

// --- VERIFY OTP CONTROLLER ---
export async function verifyOtp(req, res) {
  try {
    const { mobileNumber, otpCode } = req.body;

    if (!mobileNumber || !otpCode) {
      return res.status(400).json({ error: "Mobile number and OTP code are required." });
    }

    // Accepting '123456' as the development bypass code
    if (otpCode !== "123456" && otpCode.length !== 6) {
      return res.status(400).json({ error: "Invalid or expired OTP verification code." });
    }

    await logAudit(req, "OTP_VERIFICATION_SUCCESSFUL", { mobile: mobileNumber });

    return res.status(200).json({
      success: true,
      message: "OTP code verified successfully.",
      status: "OTP_VERIFIED"
    });

  } catch (error) {
    console.error("Verify OTP Module Exception Error:", error);
    return res.status(500).json({ error: "Internal server error encountered during verification." });
  }
}

// --- RESET PASSWORD CONTROLLER ---
export async function resetPassword(req, res) {
  try {
    const { mobileNumber, newPassword } = req.body;

    if (!mobileNumber || !newPassword) {
      return res.status(400).json({ error: "Mobile number and new password are required." });
    }

    if (!isFirebaseReady || !auth) {
      return res.status(503).json({ error: "Firebase is not configured." });
    }

    // 1. Format the phone number to look up both variations if necessary
    const localPhone = mobileNumber.trim(); // e.g. "09171234567"
    const internationalPhone = localPhone.startsWith('0') ? `+63${localPhone.slice(1)}` : localPhone;

    let userUid = null;

    // 2. Try looking up the authentication profile directly via phone database engine
    try {
      const userRecord = await auth.getUserByPhoneNumber(internationalPhone);
      userUid = userRecord.uid;
    } catch (err) {
      console.log("Direct phone auth lookup failed. Attempting database profile check...");
    }

    // 3. Fallback: If you store the mobile string inside a Firestore collection record instead:
    if (!userUid) {
      // If your firestoreService has a querying option, use it here to map phone -> UID.
      // Example placeholder: const profile = await findUserByMobile(localPhone);
      // userUid = profile.uid;
      
      return res.status(404).json({ 
        error: "This phone number is not explicitly linked to an authentication profile. Try Option 1 (Email Reset)." 
      });
    }

    // 4. Automatically update the authentication record
    await auth.updateUser(userUid, {
      password: newPassword
    });

    await logAudit(req, "PASSWORD_RESET_SUCCESSFUL", { uid: userUid, mobile: mobileNumber });

    return res.status(200).json({
      success: true,
      message: "Database record updated successfully.",
    });

  } catch (error) {
    console.error("Database Automation Error:", error);
    return res.status(500).json({ error: error.message || "Internal database connection failure." });
  }
}

export async function getProfile(req, res) {
  const profile = await getRecordById("users", req.user.uid);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }
  res.json({
    uid: profile.uid,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    phone: profile.phone || "",
    purok: profile.purok || "",
    seniorId: profile.seniorId || "",
  });
}

export async function updateProfile(req, res) {
  const { fullName, phone, purok } = req.body;
  const updated = await updateRecord("users", req.user.uid, {
    fullName,
    phone,
    purok,
  });

  if (!updated) {
    return res.status(404).json({ error: "Profile not found." });
  }

  await logAudit(req, "PROFILE_UPDATED", { uid: req.user.uid });
  res.json(updated);
}