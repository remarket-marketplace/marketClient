import { ZodError } from "zod";
import { httpClient } from "..";
import { CategorySchema, ProductSchema } from "@/validation/product/product";
import { UserReadSchema } from "@/validation/user/userRead";
import { DealSchema, DealsListSchema, type Deal } from "@/validation/deal/deal";
import {
  AdminFeedbackListSchema,
  AdminFeedbackSchema,
  type AdminFeedback,
} from "@/validation/feedback/adminFeedback";
import {
  AuditActionTypesSchema,
  AuditLogsListSchema,
  type AuditLog,
} from "@/validation/audit/activityLog";

export type DashboardStatusBreakdown = { status: string; count: number }
export type DashboardSeriesPoint = { date: string; value: number }
export type DashboardCategory = {
  category_id: string
  category_name: string
  total_sales: number
  total_deals: number
}

export type DashboardData = {
  count_of_users: number
  count_of_products: number
  count_of_deals: number
  total_revenue: number
  active_disputes: number
  moderation_products: number
  deals_by_status: DashboardStatusBreakdown[]
  revenue_by_day: DashboardSeriesPoint[]
  new_users_by_day: DashboardSeriesPoint[]
  top_categories: DashboardCategory[]
}

export type FortnitePartnerStats = {
  category_slug: string
  category_name: string
  total_accounts: number
  active_listings: number
  sold_accounts: number
  raika_verified_accounts: number
  total_deals: number
  total_revenue: number
  average_deal_amount: number
  sold_share_percent: number
  deals_by_status: DashboardStatusBreakdown[]
}

export type ActivityLogFilters = {
  username?: string
  action_type?: string
  ip_address?: string
  country_code?: string
  date_from?: string
  date_to?: string
}

export const adminService = {
  async getDashboardData(days = 30): Promise<DashboardData | null> {
    try {
      const response = await httpClient.get("/admin/dashboard-info", {
        params: { days },
      });
      return response.data as DashboardData;
    } catch (e) {
      console.error("Failed to load dashboard data", e);
      return null;
    }
  },

  async getFortnitePartnerStats(): Promise<FortnitePartnerStats | null> {
    try {
      const response = await httpClient.get("/admin/partners/fortnite-stats");
      return response.data as FortnitePartnerStats;
    } catch (e) {
      console.error("Failed to load partner fortnite stats", e);
      return null;
    }
  },

  async getAdminProductList() {
    try {
      const response = await httpClient.get("/admin/products");
      return response.data.map((product: any) => {
        const transformedProduct = {
          ...product,
          images: product.images.map((img: any) => ({
            ...img,
            url: img.url || img.image_url || "",
          })),
        };
        return ProductSchema.parse(transformedProduct);
      });
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return [];
    }
  },

  async approveProduct(productId: string) {
    try {
      const response = await httpClient.post(
        `/admin/products/approve/${productId}`
      );
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async rejectProduct(
    productId: string,
    reasonCode: string,
    reasonText?: string | null,
  ) {
    try {
      const response = await httpClient.post("/admin/products/reject", {
        product_id: productId,
        reason_code: reasonCode,
        reason_text: reasonText ?? null,
      });
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async updateProductStatus(
    productId: string,
    status: string,
    reasonCode?: string | null,
    reasonText?: string | null,
  ) {
    try {
      const response = await httpClient.patch("/admin/products/status", {
        product_id: productId,
        status,
        reason_code: reasonCode ?? null,
        reason_text: reasonText ?? null,
      });
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async getAllUsers() {
    try {
      const response = await httpClient.get("/admin/users");
      return response.data.map((user: any) => UserReadSchema.parse(user));
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async getUserById(userId: string) {
    try {
      const response = await httpClient.get(`/admin/user/${userId}`);
      return UserReadSchema.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async updateUserData(userId: string, updateData: any) {
    try {
      await httpClient.patch(`/admin/user/${userId}`, updateData);
    } catch (e) {
      return false;
    }
  },

  async uploadUserAvatar(userId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.patch(`/admin/user/${userId}/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return UserReadSchema.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async deleteUserAvatar(userId: string) {
    try {
      const response = await httpClient.delete(`/admin/user/${userId}/avatar`);
      return UserReadSchema.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async banUser(userId: string, reasonCode: string, reasonText?: string | null) {
    try {
      const response = await httpClient.post("/admin/ban-user", {
        id: userId,
        reason_code: reasonCode,
        reason_text: reasonText ?? null,
      });
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async unbanUser(userId: string) {
    try {
      const response = await httpClient.post("/admin/unban-user", {
        id: userId,
      });
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async SearchUsers(query: string) {
    try {
      const response = await httpClient.get("/admin/users/search", {
        params: { q: query },
      });
      return response.data.map((user: any) => UserReadSchema.parse(user));
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },

  async getAllDeals(page: number, perPage: number) {
    try {
      const response = await httpClient.get("/admin/deals", {
        params: { page, per_page: perPage },
      });
      return DealsListSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async refundDeal(dealId: string): Promise<Deal | false> {
    //
    // refund deal api request
    //
    try {
      const response = await httpClient.patch("/admin/deals/refund", {
        deal_id: dealId,
      });
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async cancelDeal(dealId: string): Promise<Deal | false> {
    //
    // cancel deal api request
    //
    try {
      const response = await httpClient.patch("/admin/deals/cancel", {
        deal_id: dealId,
      });
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async confirmDeal(dealId: string): Promise<Deal | false> {
    //
    // confirm deal api request
    //
    try {
      const response = await httpClient.patch("/admin/deals/confirm", {
        deal_id: dealId,
      });
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async resolveDealDispute(dealId: string, inFavorOf: "seller" | "buyer", reason: string) {
    //
    // resolve deal dispute
    //
    try {
      const response = await httpClient.patch("/admin/deals/resolve-dispute", {
        deal_id: dealId,
        resolve_favor: inFavorOf,
        reason,
      });
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async updateDealStatus(dealId: string, status: string): Promise<Deal | false> {
    try {
      const response = await httpClient.patch("/admin/deals/status", {
        deal_id: dealId,
        status,
      });
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async getCategoryData(categoryId: string) {
    //
    // get category data
    //
    try {
      const response = await httpClient.get(`/admin/category/${categoryId}`);
      return CategorySchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async updateCategoryData (categoryId: string, name: string, description: string, isActive: boolean, newImage: File | null) {
    //
    // update category data
    //
    try {
      const formData = new FormData()

      formData.append('name', name)
      formData.append('description', description)
      formData.append('is_active', isActive ? '1' : '0')
      if (newImage) {
        formData.append('uploaded_image', newImage)
      }

      const response = await httpClient.put(`/admin/category/${categoryId}`, formData);
      return CategorySchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async getDealById(dealId: string): Promise<Deal | false> {
    //
    // get deal by id
    //
    try {
      const response = await httpClient.get(`/admin/deal/${dealId}`);
      return DealSchema.parse(response.data);
    } catch (e) {
      return false;
    }
  },

  async getAdminChats(page = 1, perPage = 20) {
  try {
    const response = await httpClient.get('/admin/chats', {
      params: {
        page,
        per_page: perPage,
      },
    })

    return {
      chats: response.data.chats ?? [],
      currentPage: page,
      totalPages: response.data.total_pages ?? 1,
      total: response.data.total ?? 0,
    }
  } catch (e) {
    if (e instanceof ZodError) {
      console.error('Validation error:', e.issues)
    } else {
      console.error('Error fetching admin chats:', e)
    }

    return {
      chats: [],
      currentPage: 1,
      totalPages: 1,
      total: 0,
    }
  }
},

  async getAdminFeedbacks(page = 1, perPage = 20) {
    try {
      const response = await httpClient.get('/admin/feedback', {
        params: {
          page,
          per_page: perPage,
        },
      })

      const parsed = AdminFeedbackListSchema.parse(response.data)

      return {
        feedbacks: parsed.feedbacks,
        currentPage: page,
        totalPages: parsed.total_pages,
        total: parsed.total,
      }
    } catch (e) {
      if (e instanceof ZodError) {
        console.error('Validation error:', e.issues)
      } else {
        console.error('Error fetching admin feedbacks:', e)
      }

      return {
        feedbacks: [],
        currentPage: 1,
        totalPages: 1,
        total: 0,
      }
    }
  },

  async getAdminFeedbackById(feedbackId: string): Promise<AdminFeedback | null> {
    try {
      const response = await httpClient.get(`/admin/feedback/${feedbackId}`)
      return AdminFeedbackSchema.parse(response.data)
    } catch (e) {
      if (e instanceof ZodError) {
        console.error('Validation error:', e.issues)
      } else {
        console.error('Error fetching admin feedback by id:', e)
      }
      return null
    }
  },

  async getChatParticipants(chatId: string) {
    try {
      const response = await httpClient.get(`/admin/chat/${chatId}/participants`)
      return response.data as {
        id: string
        buyer: { id: string; username: string; avatar_url: string | null; is_active: boolean } | null
        seller: { id: string; username: string; avatar_url: string | null; is_active: boolean } | null
        support_user: { id: string; username: string; avatar_url: string | null; is_active: boolean } | null
      }
    } catch (e) {
      console.error('Error fetching chat participants', e)
      return null
    }
  },

  async getActivityLogs(
    page = 1,
    perPage = 30,
    filters: ActivityLogFilters = {},
  ): Promise<{
    logs: AuditLog[]
    currentPage: number
    totalPages: number
    total: number
  }> {
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          params[key] = String(value).trim()
        }
      })

      const response = await httpClient.get("/admin/activity-logs", { params })
      const parsed = AuditLogsListSchema.parse(response.data)
      return {
        logs: parsed.logs,
        currentPage: page,
        totalPages: parsed.total_pages,
        total: parsed.total,
      }
    } catch (e) {
      if (e instanceof ZodError) {
        console.error("Activity logs validation error:", e.issues)
      } else {
        console.error("Error fetching activity logs:", e)
      }
      return {
        logs: [],
        currentPage: 1,
        totalPages: 1,
        total: 0,
      }
    }
  },

  async getActivityLogActionTypes(): Promise<string[]> {
    try {
      const response = await httpClient.get("/admin/activity-logs/action-types")
      const parsed = AuditActionTypesSchema.parse(response.data)
      return parsed.action_types
    } catch (e) {
      if (e instanceof ZodError) {
        console.error("Activity action types validation error:", e.issues)
      } else {
        console.error("Error fetching activity action types:", e)
      }
      return []
    }
  },

};
