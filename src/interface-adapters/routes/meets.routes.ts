import { Hono } from "hono";
import { MeetController } from "../controllers/MeetController";

const meetsRoutes = new Hono();
const meetController = new MeetController();

meetsRoutes.get("/", (c) => meetController.getExploreMeets(c));
meetsRoutes.get("/mine", (c) => meetController.getMyMeets(c));
meetsRoutes.post("/", (c) => meetController.createMeet(c));
meetsRoutes.get("/:id/requests", (c) => meetController.getMeetRequests(c));
meetsRoutes.post("/:id/requests", (c) => meetController.createMeetRequest(c));
meetsRoutes.put("/:id/requests/:requestId", (c) => meetController.updateMeetRequest(c));
meetsRoutes.put("/:id", (c) => meetController.updateMeetStatus(c));

export default meetsRoutes;
