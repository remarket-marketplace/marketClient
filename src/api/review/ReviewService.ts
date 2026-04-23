import { ProfileDataSchema } from "@/validation/user/userRead";
import { ZodError } from "zod";
import { httpClient } from "..";
import { ReviewSchema, ReviewsListSchema } from "@/validation/review/review";
import type { Deal } from "@/validation/deal/deal";

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

  async getUserPurchases(
    userId: string,
    page = 1,
    perPage = 20
  ): Promise<{
    purchases: Deal[];
    total: number;
    totalPages: number;
  }> {
    try {
      const response = await httpClient.get(`/users/${userId}/purchases`, {
        params: {
          page,
          per_page: perPage,
        },
      });

      return {
        purchases: response.data.items,
        total: response.data.total,
        totalPages: response.data.total_pages,
      };
    } catch (error) {
      console.error("Ошибка при загрузке покупок:", error);
      return {
        purchases: [],
        total: 0,
        totalPages: 1,
      };
    }
  },

  async getUserReviews(
    username: string,
    page = 1,
    perPage = 20
  ): Promise<{
    reviews: ReviewSchema[];
    total: number;
    totalPages: number;
  }> {
    try {
      const response = await httpClient.get(`/reviews/${username}`, {
        params: {
          page,
          per_page: perPage,
        },
      });

      return {
        reviews: ReviewSchema.array().parse(
          response.data.items || response.data.reviews
        ),
        total: response.data.total,
        totalPages: response.data.total_pages,
      };
    } catch (error) {
      console.error("Ошибка при загрузке отзывов:", error);
      return {
        reviews: [],
        total: 0,
        totalPages: 1,
      };
    }
  },

  async getUserReviewsCount(username: string): Promise<number> {
    try {
      const response = await httpClient.get(`/reviews/${username}/count`);
      return Number(response.data?.total ?? 0);
    } catch (error) {
      console.error("Ошибка при загрузке количества отзывов:", error);
      return 0;
    }
  },
};
