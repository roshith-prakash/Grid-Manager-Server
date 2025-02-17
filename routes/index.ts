import { Router } from "express";
import { getName } from "../controllers/index.ts"

// Create a router.
const router = Router();

// Default route to check if auth routes are accessible.
router.get("/", (_, res) => {
  res.status(200).send({ data: "Default Route" });
  return
});

// Example Route
router.get("/getName", getName);

export default router;