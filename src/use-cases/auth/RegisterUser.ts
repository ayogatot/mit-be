import { UserRepository, User } from "../../domain/repositories/UserRepository";
import { sign } from "jsonwebtoken";

export interface RegisterInput {
  email: string;
  password?: string;
  name: string;
}

export class RegisterUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: RegisterInput): Promise<{ user: User, token: string }> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await Bun.password.hash(input.password || "");
    const newUser = await this.userRepository.create({
      email: input.email,
      password: hashedPassword,
      name: input.name
    });

    const token = sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: "24h" }
    );

    return { user: newUser, token };
  }
}
