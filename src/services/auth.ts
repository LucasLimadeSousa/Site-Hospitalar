
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface User {
  id: number;
  nome: string;
  credential: string;
}

interface LoginResponse {
  status: string;
  message: string;
  token: string;
  user: User;
}

interface SessionResponse {
  status: string;
  user: User;
}

export async function login(
  credential: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ credential, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível realizar o login.");
  }

  return data as LoginResponse;
}

export async function getSession(token: string): Promise<SessionResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Sessão inválida.");
  }

  return data as SessionResponse;
}
