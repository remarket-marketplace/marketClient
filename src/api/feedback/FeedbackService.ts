import { httpClient } from "..";

type SendFeedbackResult =
  | { success: true }
  | { success: false; errorMessage: string };

function getFeedbackErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const firstMessage = detail.find((item) => typeof item?.msg === "string")?.msg;
    return firstMessage || fallback;
  }

  return detail?.error_message || fallback;
}

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
      return {
        success: false,
        errorMessage: getFeedbackErrorMessage(error, "Failed to send feedback"),
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
      return {
        success: false,
        errorMessage: getFeedbackErrorMessage(error, "Не удалось отправить жалобу"),
      };
    }
  },
};
