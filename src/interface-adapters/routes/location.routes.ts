import { Hono } from "hono";
import { LocationController } from "../controllers/LocationController";

const router = new Hono();
const locationController = new LocationController();

// Since this is mapped to protectedRoutes in index.ts, it will already have jwtMiddleware applied
router.get("/", (c) => locationController.getAll(c));
router.post("/", (c) => locationController.create(c));

export default router;
