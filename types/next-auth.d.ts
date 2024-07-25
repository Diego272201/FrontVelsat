import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      login: string;
      token: string;
      username: string;
      serverUrl: string; // Añadir serverUrl
    };
  }

  interface User {
    serverUrl: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    serverUrl: string;
  }
}
