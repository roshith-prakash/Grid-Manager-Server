import upload from "../utils/multer.js";
import {
  createUser,
  getCurrentUser,
  getUserProfile,
  checkIfUsernameExists,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller.ts";
import { Router } from "express";

// Create a router.
const router = Router();

// Default route to check if auth routes are accessible.
router.get("/", (_, res) => {
  res.status(200).send({ data: "Auth Route" });
});

// Create a new user in the database.
router.post("/create-user", upload.single("file"), createUser);

// Get the current user from the DB.
router.post("/get-current-user", getCurrentUser);

// Get the user information from the DB.
router.post("/get-user-info", getUserProfile);

// Check if username already exists
router.post("/checkUsername", checkIfUsernameExists);

// Update the user's details in the database.
router.post("/update-user", upload.single("file"), updateUser);

// Delete the user data from the database.
router.post("/delete-user", deleteUser);

export default router;
