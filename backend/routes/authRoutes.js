import { Router } from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  forgotPassword,
  verifyOtp,   
  resetPassword, 
  getProfile,
  updateProfile
} from "../controllers/authController.js";

const router = Router();

// Your other working routes...
router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", loginUser);

// --- ADD / VERIFY THESE THREE ENDPOINTS FOR YOUR WIZARD ---
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;