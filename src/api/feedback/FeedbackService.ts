import { httpClient } from "..";

type SendFeedbackResult =
  | { success: true }
  | { success: false; errorMessage: string };

export const feedbackService = {
  async sendFeedback(
    feedbackText: string,
    captchaToken: string,
    uploadedImages: File[] = []
  ): Promise<SendFeedbackResult> {
    try {
      const formData = new FormData();
      formData.append("feedback_text", feedbackText);
      formData.append("captcha_token", captchaToken);

      uploadedImages.forEach((image) => {
        formData.append("uploaded_images", image);
      });

      await httpClient.post("/feedback/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return { success: true };
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const errorMessage =
        typeof detail === "string"
          ? detail
          : detail?.error_message || "Failed to send feedback";

      return {
        success: false,
        errorMessage,
      };
    }
  },
};
