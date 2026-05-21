import { Hono } from "hono";
import { MatchController } from "../controllers/MatchController";

const matchesRoutes = new Hono();
const matchController = new MatchController();

matchesRoutes.get("/", (c) => matchController.getMatches(c));

export default matchesRoutes;
