import { Hono } from "hono";
import { SwipeController } from "../controllers/SwipeController";
// import { jwtMiddleware } from "../middleware/jwt"; // Mocked representation

const swipeRoutes = new Hono();
const swipeController = new SwipeController();

// Apply JWT middleware to protect this route
// swipeRoutes.use('/*', jwtMiddleware)

swipeRoutes.post("/", (c) => swipeController.handleSwipe(c));

export default swipeRoutes;
