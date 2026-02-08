import axios from "axios";
import {
  ProfileDataSchema,
  PublicProfileDataSchema,
  type ProfileData,
  type PublicProfileData,
} from "@/validation/user/userRead";
import { ZodError } from "zod";
import { httpClient } from "..";
import { SimpleDealsListSchema } from "@/validation/deal/deal";

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
      return response.data;
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      return null;
    }
  },
};
