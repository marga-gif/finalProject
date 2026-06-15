import { Router } from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.post("/register", registerUser);
router.post("/register/admin", registerAdmin);
router.post("/login", loginUser);
router.get("/profile", authenticate, requireUserOrAdmin, getProfile);
router.patch("/profile", authenticate, requireUserOrAdmin, updateProfile);

export default router;
