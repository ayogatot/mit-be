import { UserRepository } from "../../domain/repositories/UserRepository";
import { sign } from "jsonwebtoken";

export interface LoginInput {
  email: string;
  password?: string;
}

export class LoginUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: LoginInput): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isMatch = await Bun.password.verify(input.password || "", user.password!);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: "24h" }
    );

    return { token };
  }
}
