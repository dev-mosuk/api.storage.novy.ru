export interface UserSlugProps {
  id: number;
  login?: string;
}

export interface UserSlugResult {
  id: number;
  login?: string;
  loginOrId: string;
}
