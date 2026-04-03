import axios from "axios";
import {
  ProfileDataSchema,
  PublicProfileDataSchema,
  UserReadSchema,
  type UserRead,
  type ProfileData,
  type PublicProfileData,
} from "@/validation/user/userRead";
import { ZodError } from "zod";
import { httpClient } from "..";
import { SimpleDealsListSchema } from "@/validation/deal/deal";
import {
  UserSubscriptionsListSchema,
  type UserSubscriptionsList,
} from "@/validation/user/subscriptions";

export const profileService = {
  async getUserProfileData(
    username: string
  ): Promise<PublicProfileData | ProfileData | null> {
    try {
      const response = await httpClient.get(`/users/${username}`);

      try {
        return ProfileDataSchema.parse(response.data);
      } catch {
        return PublicProfileDataSchema.parse(response.data);
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        throw e;
      }
      if (e instanceof ZodError)
        console.error("Ошибка валидации профиля:", e.issues);
      return null;
    }
  },

  async updateProfileDescription(new_description: string) {
    try {
      const response = await httpClient.post("/users/description", {
        description: new_description,
      });
      return ProfileDataSchema.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async getUserPurchases(page = 1, perPage = 20) {
    try {
      const response = await httpClient.get(`/deal/`, {
        params: {
          page,
          per_page: perPage,
        },
      });

      return {
        deals: SimpleDealsListSchema.parse(
          response.data.items || response.data.deals
        ),
        total: response.data.total,
        totalPages: response.data.total_pages,
      };
    } catch (error) {
      console.error("Ошибка при загрузке покупок:", error);
      return {
        deals: [],
        total: 0,
        totalPages: 1,
      };
    }
  },

  async uploadAvatar(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.patch("/users/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return UserReadSchema.parse(response.data).avatar_url;
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      return null;
    }
  },

  async uploadProfileBackground(file: File): Promise<UserRead> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await httpClient.patch(
      "/users/profile-background",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return UserReadSchema.parse(response.data);
  },

  async subscribeToSeller(username: string): Promise<boolean | null> {
    try {
      const response = await httpClient.post(`/users/${username}/subscribe`);
      return Boolean(response.data?.is_subscribed);
    } catch (error) {
      console.error("Ошибка подписки на продавца:", error);
      return null;
    }
  },

  async unsubscribeFromSeller(username: string): Promise<boolean | null> {
    try {
      const response = await httpClient.delete(`/users/${username}/subscribe`);
      return Boolean(response.data?.is_subscribed);
    } catch (error) {
      console.error("Ошибка отписки от продавца:", error);
      return null;
    }
  },

  async getMySubscriptions(): Promise<UserSubscriptionsList> {
    try {
      const response = await httpClient.get("/users/subscriptions");
      return UserSubscriptionsListSchema.parse(response.data);
    } catch (error) {
      console.error("Ошибка загрузки подписок:", error);
      return {
        subscriptions: [],
        total: 0,
      };
    }
  },
};
