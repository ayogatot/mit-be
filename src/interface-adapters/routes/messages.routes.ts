import { Hono } from "hono";
import { MessageController } from "../controllers/MessageController";

const messagesRoutes = new Hono();
const messageController = new MessageController();

messagesRoutes.get("/:matchId", (c) => messageController.getConversation(c));
messagesRoutes.post("/:matchId", (c) => messageController.sendMessage(c));

export default messagesRoutes;
