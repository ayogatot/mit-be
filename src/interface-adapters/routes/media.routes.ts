import { Hono } from "hono";
import { MediaController } from "../controllers/MediaController";

const mediaRoutes = new Hono();
const mediaController = new MediaController();

mediaRoutes.post("/upload", (c) => mediaController.upload(c));

export default mediaRoutes;
