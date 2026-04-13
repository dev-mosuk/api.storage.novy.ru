export interface UserNameProps {
  id: number;
  name?: string;
  login?: string;
  email?: string;
}

export interface UserNameResult {
  initial?: string;
  formatted: string;
}
