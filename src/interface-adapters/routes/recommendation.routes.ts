import { Hono } from "hono";
import { RecommendationController } from "../controllers/RecommendationController";

const recommendationRoutes = new Hono();
const recommendationController = new RecommendationController();

recommendationRoutes.get("/", (c) => recommendationController.getProfiles(c));

export default recommendationRoutes;
