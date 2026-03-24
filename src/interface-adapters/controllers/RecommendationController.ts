import { Context } from "hono";
import { GetProfilesUseCase } from "../../use-cases/recommendation/GetProfiles";
import { DrizzleUserRepository } from "../../infrastructure/repositories/DrizzleUserRepository";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class RecommendationController {
  private getProfilesUseCase: GetProfilesUseCase;

  constructor() {
    const repository = new DrizzleUserRepository();
    this.getProfilesUseCase = new GetProfilesUseCase(repository);
  }

  async getProfiles(c: Context) {
    try {
      // Assuming userId is extracted from JWT by middleware
      const userId = c.get('jwtPayload')?.id; 
      if (!userId) {
        return errorResponse(c, "Unauthorized", 401);
      }

      const limit = Number(c.req.query('limit') || 20);
      const offset = Number(c.req.query('offset') || 0);

      const result = await this.getProfilesUseCase.execute(userId, limit, offset);

      return successResponse(c, { data: result, limit, offset }, "Profiles fetched successfully", 200);
    } catch (error: any) {
        console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
