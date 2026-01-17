import { ZodError } from "zod";
import { httpClient } from "..";
import { UserReadSchema, type UserRead } from "@/validation/user/userRead";
import { useUserStore } from "@/stores/user";

export const authService = {
  async getUser(): Promise<UserRead | null> {
    try {
      const response = await httpClient.post("/auth/");
      const userData = UserReadSchema.parse(response.data);
      return userData;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return null;
    }
  },

  async sendVerificationCode(email: string, username: string, captchaToken: string) {
    return await httpClient.post("/auth/send-verification-code", {
      email,
      username,
      captcha_token: captchaToken
    });
  },

  async sendPasswordResetLetter(email: string, captchaToken: string) {
    return httpClient.post("/auth/password-reset-letter", {
      email: email,
      captcha_token: captchaToken
    });
  },

  async checkResetTokenNotExpired(resetToken: string) {
    return httpClient.post("/auth/reset-token-not-expired", {
      token: resetToken,
    });
  },

  async resetPassword(resetToken: string, newPassword: string) {
    return httpClient.post("/auth/reset-password", {
      token: resetToken,
      new_password: newPassword,
    });
  },

  async signIn(email: string, password: string, captchaToken: string) {
    const response = await httpClient.post("/auth/login", {
      email,
      password,
      captcha_token: captchaToken
    });
    const userData = UserReadSchema.parse(response.data);
    await useUserStore().setUser(userData);
    return response;
  },

  async signUp(
    email: string,
    password: string,
    username: string,
    code: string
  ) {
    try {
      const response = await httpClient.post(
        "/auth/confirm-verification-code",
        {
          email,
          username,
          password,
          email_code: code,
        }
      );
      const userData = UserReadSchema.parse(response.data);
      await useUserStore().setUser(userData);
      return true;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error("Ошибка валидации пользователя:", e.issues);
      }
      return false;
    }
  },

  async refreshTokens() {
    try {
      const response = await httpClient.post("/auth/update-tokens");
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async logout() {
    try {
      const response = await httpClient.post("/auth/logout", {});
      await useUserStore().clearUser();
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      await useUserStore().clearUser();
      return false;
    }
  },

  async getMyUserId() {
    try {
      const response = await httpClient.get("/auth/get-my-user-id");
      return response.data;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async pingOnlineStatus() {
    await httpClient.patch("/users/ping-online");
  },
};
