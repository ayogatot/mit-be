import { Hono } from "hono";
import { MeController } from "../controllers/MeController";

const meRoutes = new Hono();
const meController = new MeController();

meRoutes.get("/", (c) => meController.getMe(c));
meRoutes.put("/", (c) => meController.updateMe(c));
meRoutes.get("/preferences", (c) => meController.getPreferences(c));
meRoutes.put("/preferences", (c) => meController.updatePreferences(c));
meRoutes.patch("/password", (c) => meController.changePassword(c));
meRoutes.post("/fcm-token", (c) => meController.registerFcmToken(c));

export default meRoutes;
