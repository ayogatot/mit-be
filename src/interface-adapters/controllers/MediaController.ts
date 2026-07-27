import { Context } from "hono";
import { mkdir } from "node:fs/promises";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";
import { logger } from "../../infrastructure/utils/logger";

const UPLOAD_DIR = "./uploads";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export class MediaController {
  async upload(c: Context) {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });

      const body = await c.req.parseBody();
      const file = body["file"];

      if (!file || !(file instanceof File)) {
        return errorResponse(c, "No file provided", 400);
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return errorResponse(c, "File type not allowed. Accepted: jpeg, png, webp, gif", 400);
      }

      if (file.size > MAX_SIZE) {
        return errorResponse(c, "File too large. Maximum size is 5 MB", 400);
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;

      await Bun.write(`${UPLOAD_DIR}/${filename}`, file);

      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        throw new Error("BASE_URL environment variable is not set");
      }
      const url = `${baseUrl}/uploads/${filename}`;

      return successResponse(c, { url }, "File uploaded successfully", 201);
    } catch (error: any) {
      logger.error("Media upload error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
