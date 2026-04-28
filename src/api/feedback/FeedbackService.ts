import { httpClient } from "..";

type SendFeedbackResult =
  | { success: true }
  | { success: false; errorMessage: string };

export type ComplaintTargetType = "product" | "user";

export interface SendComplaintPayload {
  reason: string;
  description: string;
  targetType: ComplaintTargetType;
  targetId: string;
  targetLabel?: string | null;
  targetUrl?: string | null;
}

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

  async sendComplaint(payload: SendComplaintPayload): Promise<SendFeedbackResult> {
    try {
      const formData = new FormData();
      formData.append("feedback_text", payload.description);
      formData.append("feedback_type", "complaint");
      formData.append("complaint_reason", payload.reason);
      formData.append("target_type", payload.targetType);
      formData.append("target_id", payload.targetId);

      if (payload.targetLabel) {
        formData.append("target_label", payload.targetLabel);
      }

      if (payload.targetUrl) {
        formData.append("target_url", payload.targetUrl);
      }

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
          : detail?.error_message || "Failed to send complaint";

      return {
        success: false,
        errorMessage,
      };
    }
  },
};
