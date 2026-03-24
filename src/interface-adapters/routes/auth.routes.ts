import { Hono } from "hono";
import { AuthController } from "../controllers/AuthController";

const authRoutes = new Hono();
const authController = new AuthController();

authRoutes.post("/register", (c) => authController.register(c));
authRoutes.post("/login", (c) => authController.login(c));

export default authRoutes;
