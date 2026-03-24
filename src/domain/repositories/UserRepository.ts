export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  gender_id: string | null;
  age: number | null;
  profile_picture_url: string | null;
  job_title: string | null;
  zodiac: string | null;
  about_me: string | null;
  looking_for: string | null;
  is_verified: boolean;
  is_premium: boolean;
  interests?: { id: string; name: string }[];
  relations?: { id: string; name: string }[];
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  getUnswipedProfiles(userId: string, limit: number, offset: number): Promise<User[]>;
}
