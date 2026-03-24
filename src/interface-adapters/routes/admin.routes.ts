import { Hono } from "hono";
import { AdminController } from "../controllers/AdminController";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = new Hono();
const adminController = new AdminController();

// Apply adminMiddleware to all routes in this router
router.use("/*", adminMiddleware);

// Generic CRUD endpoints mapped by table name (locations, interests, relations, languages)
router.get("/:table", (c) => adminController.getAll(c));
router.post("/:table", (c) => adminController.create(c));
router.put("/:table/:id", (c) => adminController.update(c));
router.delete("/:table/:id", (c) => adminController.remove(c));

export default router;
