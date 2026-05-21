import { Hono } from "hono";
import { ReportController } from "../controllers/ReportController";

const reportsRoutes = new Hono();
const reportController = new ReportController();

reportsRoutes.post("/", (c) => reportController.createReport(c));

export default reportsRoutes;
