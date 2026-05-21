import { Hono } from "hono";
import { MeController } from "../controllers/MeController";

const meRoutes = new Hono();
const meController = new MeController();

meRoutes.get("/", (c) => meController.getMe(c));
meRoutes.put("/", (c) => meController.updateMe(c));
meRoutes.put("/preferences", (c) => meController.updatePreferences(c));

export default meRoutes;
