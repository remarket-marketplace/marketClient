import { ZodError } from "zod";
import { httpClient } from "..";
import { UserReadSchema, type UserRead } from "@/validation/user/userRead";
import { LoginResponseSchema, type LoginResponse } from "@/validation/auth/login";
import { useUserStore } from "@/stores/user";
import { chatsService } from "@/api/chats/chatsService";

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

  async sendLoginCode(email: string, captchaToken: string) {
    return await httpClient.post("/auth/send-login-code", {
      email,
      captcha_token: captchaToken
    });
  },

  async resendLoginCode(email: string) {
    return await httpClient.post("/auth/resend-login-code", {
      email,
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

  async signIn(
    email: string,
    password: string,
    captchaToken: string,
  ): Promise<LoginResponse> {
    chatsService.disconnect();
    const response = await httpClient.post("/auth/login", {
      email,
      password,
      captcha_token: captchaToken
    });
    const loginResponse = LoginResponseSchema.parse(response.data);

    if (!loginResponse.two_factor_required && loginResponse.user) {
      await useUserStore().setUser(loginResponse.user);
    }

    return loginResponse;
  },

  async confirmTwoFactorLogin(twoFactorToken: string, code: string): Promise<UserRead> {
    chatsService.disconnect();
    const response = await httpClient.post("/auth/login/2fa", {
      two_factor_token: twoFactorToken,
      code,
    });
    const userData = UserReadSchema.parse(response.data);
    await useUserStore().setUser(userData);
    return userData;
  },

  async confirmLoginCode(email: string, code: string): Promise<UserRead> {
    chatsService.disconnect();
    const response = await httpClient.post("/auth/confirm-login-code", {
      email,
      email_code: code,
    });
    const userData = UserReadSchema.parse(response.data);
    await useUserStore().setUser(userData);
    return userData;
  },

  async signUp(
    email: string,
    username: string,
    code: string
  ) {
    chatsService.disconnect();
    const response = await httpClient.post(
      "/auth/confirm-verification-code",
      {
        email,
        username,
        email_code: code,
      }
    );
    const userData = UserReadSchema.parse(response.data);
    await useUserStore().setUser(userData);
    return userData;
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
    } finally {
      chatsService.disconnect();
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
