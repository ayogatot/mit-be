import { Context } from "hono";
import { RegisterUserUseCase } from "../../use-cases/auth/RegisterUser";
import { LoginUserUseCase } from "../../use-cases/auth/LoginUser";
import { DrizzleUserRepository } from "../../infrastructure/repositories/DrizzleUserRepository";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class AuthController {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;

  constructor() {
    const repository = new DrizzleUserRepository();
    this.registerUseCase = new RegisterUserUseCase(repository);
    this.loginUseCase = new LoginUserUseCase(repository);
  }

  async register(c: Context) {
    try {
      const body = await c.req.json();
      
      const result = await this.registerUseCase.execute({
        email: body.email,
        password: body.password,
        name: body.name,
      });

      return successResponse(c, result, "User registered successfully", 201);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }

  async login(c: Context) {
    try {
      const body = await c.req.json();

      const result = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
      });

      return successResponse(c, result, "Login successful", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 401);
    }
  }
}
