import axios from "axios";
import { httpClient } from "..";
import type { FortniteAccountDetails } from "@/validation/product/product";

export interface RaikaDraft {
  draft_id: string;
  description: string;
  images: string[];
  fortnite_account_details?: FortniteAccountDetails | null;
}

export const raikaService = {
  async getDraft(draftId: string): Promise<RaikaDraft | null> {
    try {
      const response = await httpClient.get(`/raika/draft/${draftId}`);
      return {
        draft_id: response.data.draft_id,
        description: response.data.description ?? "",
        images: Array.isArray(response.data.images)
          ? response.data.images.filter((image: unknown): image is string => typeof image === "string")
          : [],
        fortnite_account_details:
          response.data.fortnite_account_details && typeof response.data.fortnite_account_details === "object"
            ? response.data.fortnite_account_details
            : null,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
