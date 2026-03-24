import { UserRepository } from "../../domain/repositories/UserRepository";

export class GetProfilesUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string, limit: number = 20, offset: number = 0) {
    // Returns users that the current user hasn't swiped on yet
    return await this.userRepository.getUnswipedProfiles(userId, limit, offset);
  }
}
