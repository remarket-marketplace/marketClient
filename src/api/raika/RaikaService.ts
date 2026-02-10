import axios from "axios";
import { httpClient } from "..";

export interface RaikaDraft {
  draft_id: string;
  description: string;
  images: string[];
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
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
