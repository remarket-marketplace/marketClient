import { ProfileDataSchema } from "@/validation/user/userRead";
import { ZodError } from "zod";
import { httpClient } from "..";
import { ReviewSchema, ReviewsListSchema } from "@/validation/review/review";

export const reviewService = {
  async createReview(dealId: string, rating: number, body: string) {
    try {
      const response = await httpClient.post("/reviews/", {
        deal_id: dealId,
        rating: rating,
        body: body,
      });
      return ReviewSchema.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
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

  async getUserPurchases(userId: string) {
    try {
      const response = await httpClient.get(`/users/${userId}/purchases`);
      return response.data || [];
    } catch (error) {
      console.error("Ошибка при загрузке покупок:", error);
      return [];
    }
  },

  async getUserReviews(username: string) {
    try {
      const response = await httpClient.get(`/reviews/${username}`);
      return ReviewsListSchema.parse(response.data)
    } catch (error) {
      console.error("Ошибка при загрузке отзывов:", error);
      return [];
    }
  }
};
