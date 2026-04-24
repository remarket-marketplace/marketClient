import axios from "axios";
import { ZodError } from "zod";
import { httpClient } from "..";
import { ProductSchema, type Product } from "@/validation/product/product";
import { ErrorHandler, type ApiError } from "../errorHandler";
import { PRODUCT_IMAGE_MIME_TYPES } from "@/utils/imageUpload";

const UPLOAD_REQUEST_TIMEOUT_MS = 120000;
const DIRECT_UPLOAD_SUPPORTED_CONTENT_TYPES = PRODUCT_IMAGE_MIME_TYPES;

interface ProductDirectUploadRequestFile {
  filename: string;
  content_type: string;
  size: number;
}

interface ProductDirectUploadRequestPayload {
  files: ProductDirectUploadRequestFile[];
}

interface ProductDirectUploadItem {
  upload_url: string;
  image_url: string;
  content_type: string;
  filename: string;
}

interface ProductDirectUploadResponsePayload {
  uploads: ProductDirectUploadItem[];
  expires_in_seconds: number;
}

export interface ProductsFilterParams {
  minPrice?: number;
  maxPrice?: number;
  createdFrom?: string;
  createdTo?: string;
  sortStack?: Array<
    "price_desc"
    | "price_asc"
    | "seller_rating_desc"
    | "seller_rating_asc"
    | "seller_reviews_desc"
    | "seller_reviews_asc"
    | "created_at_desc"
    | "created_at_asc"
  >;
  sortBy?: "created_at" | "price" | "seller_rating" | "seller_reviews";
  sortOrder?: "asc" | "desc";
  sellerMinRating?: number;
  sellersWithReviewsOnly?: boolean;
  onlineSellersOnly?: boolean;
  autoDeliveryOnly?: boolean;
  isOfficialOnly?: boolean;
  excludeOfficial?: boolean;
  fortniteCountry?: string;
  fortniteCanChangeEmail?: boolean;
  fortniteFirstEmail?: boolean;
  fortniteEmailConfirmed?: boolean;
  fortniteParentalControl?: boolean;
  fortniteTwoFactorEnabled?: boolean;
  fortniteRegistrationDateFrom?: string;
  fortniteRegistrationDateTo?: string;
  fortniteLastEmailChangeFrom?: string;
  fortniteLastEmailChangeTo?: string;
  fortniteLastLoginFrom?: string;
  fortniteLastLoginTo?: string;
  fortniteLastDisplayNameChangeFrom?: string;
  fortniteLastDisplayNameChangeTo?: string;
  fortniteLastMatchDateFrom?: string;
  fortniteLastMatchDateTo?: string;
  fortniteSkinsCountMin?: number;
  fortniteSkinsCountMax?: number;
  fortniteBackpacksCountMin?: number;
  fortniteBackpacksCountMax?: number;
  fortnitePickaxesCountMin?: number;
  fortnitePickaxesCountMax?: number;
  fortniteEmotesCountMin?: number;
  fortniteEmotesCountMax?: number;
  fortniteGlidersCountMin?: number;
  fortniteGlidersCountMax?: number;
  fortniteWrapsCountMin?: number;
  fortniteWrapsCountMax?: number;
  fortniteBannersCountMin?: number;
  fortniteBannersCountMax?: number;
  fortniteSpraysCountMin?: number;
  fortniteSpraysCountMax?: number;
  fortniteExclusivesCountMin?: number;
  fortniteExclusivesCountMax?: number;
}

export interface ProductCurrencyConfig {
  base_currency: "RUB";
  supported_currencies: string[];
  usd_rub_rate: number;
  rate_source?: string;
  rate_updated_at?: string | null;
  is_fallback_rate?: boolean;
  min_price_rub: number;
  max_price_rub: number;
}

export interface OfficialStoreConfig {
  hero_image_url: string | null;
}

function buildProductsFilterParams(filters?: ProductsFilterParams) {
  if (!filters) return {};

  const params: Record<string, string | number | boolean> = {};

  if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
  if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;
  if (filters.createdFrom) params.created_from = filters.createdFrom;
  if (filters.createdTo) params.created_to = filters.createdTo;
  if (filters.sortStack?.length) params.sort_stack = filters.sortStack.join(",");
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;
  if (filters.sellerMinRating !== undefined) params.seller_min_rating = filters.sellerMinRating;
  if (filters.sellersWithReviewsOnly === true) params.sellers_with_reviews_only = true;
  if (filters.onlineSellersOnly === true) params.online_sellers_only = true;
  if (filters.autoDeliveryOnly === true) params.auto_delivery_only = true;
  if (filters.isOfficialOnly === true) params.is_official_only = true;
  if (filters.excludeOfficial === true) params.exclude_official = true;
  if (filters.fortniteCountry) params.fortnite_country = filters.fortniteCountry;
  if (filters.fortniteCanChangeEmail !== undefined) params.fortnite_can_change_email = filters.fortniteCanChangeEmail;
  if (filters.fortniteFirstEmail !== undefined) params.fortnite_first_email = filters.fortniteFirstEmail;
  if (filters.fortniteEmailConfirmed !== undefined) params.fortnite_email_confirmed = filters.fortniteEmailConfirmed;
  if (filters.fortniteParentalControl !== undefined) params.fortnite_parental_control = filters.fortniteParentalControl;
  if (filters.fortniteTwoFactorEnabled !== undefined) params.fortnite_two_factor_enabled = filters.fortniteTwoFactorEnabled;
  if (filters.fortniteRegistrationDateFrom) params.fortnite_registration_date_from = filters.fortniteRegistrationDateFrom;
  if (filters.fortniteRegistrationDateTo) params.fortnite_registration_date_to = filters.fortniteRegistrationDateTo;
  if (filters.fortniteLastEmailChangeFrom) params.fortnite_last_email_change_from = filters.fortniteLastEmailChangeFrom;
  if (filters.fortniteLastEmailChangeTo) params.fortnite_last_email_change_to = filters.fortniteLastEmailChangeTo;
  if (filters.fortniteLastLoginFrom) params.fortnite_last_login_from = filters.fortniteLastLoginFrom;
  if (filters.fortniteLastLoginTo) params.fortnite_last_login_to = filters.fortniteLastLoginTo;
  if (filters.fortniteLastDisplayNameChangeFrom) params.fortnite_last_display_name_change_from = filters.fortniteLastDisplayNameChangeFrom;
  if (filters.fortniteLastDisplayNameChangeTo) params.fortnite_last_display_name_change_to = filters.fortniteLastDisplayNameChangeTo;
  if (filters.fortniteLastMatchDateFrom) params.fortnite_last_match_date_from = filters.fortniteLastMatchDateFrom;
  if (filters.fortniteLastMatchDateTo) params.fortnite_last_match_date_to = filters.fortniteLastMatchDateTo;
  if (filters.fortniteSkinsCountMin !== undefined) params.fortnite_skins_count_min = filters.fortniteSkinsCountMin;
  if (filters.fortniteSkinsCountMax !== undefined) params.fortnite_skins_count_max = filters.fortniteSkinsCountMax;
  if (filters.fortniteBackpacksCountMin !== undefined) params.fortnite_backpacks_count_min = filters.fortniteBackpacksCountMin;
  if (filters.fortniteBackpacksCountMax !== undefined) params.fortnite_backpacks_count_max = filters.fortniteBackpacksCountMax;
  if (filters.fortnitePickaxesCountMin !== undefined) params.fortnite_pickaxes_count_min = filters.fortnitePickaxesCountMin;
  if (filters.fortnitePickaxesCountMax !== undefined) params.fortnite_pickaxes_count_max = filters.fortnitePickaxesCountMax;
  if (filters.fortniteEmotesCountMin !== undefined) params.fortnite_emotes_count_min = filters.fortniteEmotesCountMin;
  if (filters.fortniteEmotesCountMax !== undefined) params.fortnite_emotes_count_max = filters.fortniteEmotesCountMax;
  if (filters.fortniteGlidersCountMin !== undefined) params.fortnite_gliders_count_min = filters.fortniteGlidersCountMin;
  if (filters.fortniteGlidersCountMax !== undefined) params.fortnite_gliders_count_max = filters.fortniteGlidersCountMax;
  if (filters.fortniteWrapsCountMin !== undefined) params.fortnite_wraps_count_min = filters.fortniteWrapsCountMin;
  if (filters.fortniteWrapsCountMax !== undefined) params.fortnite_wraps_count_max = filters.fortniteWrapsCountMax;
  if (filters.fortniteBannersCountMin !== undefined) params.fortnite_banners_count_min = filters.fortniteBannersCountMin;
  if (filters.fortniteBannersCountMax !== undefined) params.fortnite_banners_count_max = filters.fortniteBannersCountMax;
  if (filters.fortniteSpraysCountMin !== undefined) params.fortnite_sprays_count_min = filters.fortniteSpraysCountMin;
  if (filters.fortniteSpraysCountMax !== undefined) params.fortnite_sprays_count_max = filters.fortniteSpraysCountMax;
  if (filters.fortniteExclusivesCountMin !== undefined) params.fortnite_exclusives_count_min = filters.fortniteExclusivesCountMin;
  if (filters.fortniteExclusivesCountMax !== undefined) params.fortnite_exclusives_count_max = filters.fortniteExclusivesCountMax;

  return params;
}

export const productService = {
  async getCurrencyConfig(): Promise<ProductCurrencyConfig | null> {
    try {
      const response = await httpClient.get("/products/currency-config");
      return response.data as ProductCurrencyConfig;
    } catch (e) {
      console.error("Failed to load currency config:", e);
      return null;
    }
  },

  async getOfficialStoreConfig(): Promise<OfficialStoreConfig | null> {
    try {
      const response = await httpClient.get("/products/official-store/config");
      return response.data as OfficialStoreConfig;
    } catch (e) {
      console.error("Failed to load official store config:", e);
      return null;
    }
  },

  async getAllProducts(
    page: number,
    perPage: number,
    filters?: ProductsFilterParams,
  ) {
    try {
      const response = await httpClient.get("/products/get/all", {
        params: {
          page,
          per_page: perPage,
          ...buildProductsFilterParams(filters),
        },
      });
      return {
        products: response.data.products.map((product: any) => {
          const transformedProduct = {
            ...product,
            images: product.images.map((img: any) => ({
              ...img,
              url: img.url || img.image_url || "",
            })),
          };
          return ProductSchema.parse(transformedProduct);
        }),
        totalPages: response.data.total_pages,
        currentPage: response.data.page || page,
        total: response.data.total,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return { products: [], totalPages: 1, currentPage: 1, total: 0 };
    }
  },

  async getPopularProducts(
    page: number,
    perPage: number,
    filters?: ProductsFilterParams,
  ): Promise<{
    products: Product[];
    totalPages: number;
    currentPage: number;
    total: number;
  }> {
    try {
      const response = await httpClient.get("/products/popular", {
        params: {
          page,
          per_page: perPage,
          ...buildProductsFilterParams(filters),
        },
      });
      return {
        products: response.data.products.map((product: any) => {
          const transformedProduct = {
            ...product,
            images: product.images.map((img: any) => ({
              ...img,
              url: img.url || img.image_url || "",
            })),
          };
          return ProductSchema.parse(transformedProduct);
        }),
        totalPages: response.data.total_pages,
        currentPage: response.data.page || page,
        total: response.data.total,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return { products: [], totalPages: 1, currentPage: 1, total: 0 };
    }
  },

  async getProductById(id: string) {
    try {
      const response = await httpClient.get(`/products/${id}`);
      const transformedProduct = {
        ...response.data,
        images: response.data.images.map((img: any) => ({
          ...img,
          url: img.url || img.image_url || "",
        })),
      };
      return ProductSchema.parse(transformedProduct);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        throw e;
      }
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async getProductEditDataById(id: string) {
    try {
      const response = await httpClient.get(`/products/${id}`);
      const transformedProduct = {
        ...response.data,
        images: response.data.images.map((img: any) => ({
          ...img,
          url: img.url || img.image_url || "",
        })),
      };
      return ProductSchema.parse(transformedProduct);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async getProductsByCategory(
    categoryId: string,
    page: number,
    perPage: number,
    filters?: ProductsFilterParams,
  ) {
    try {
      const response = await httpClient.get(
        `/products/category/${categoryId}`,
        {
          params: {
            page,
            per_page: perPage,
            ...buildProductsFilterParams(filters),
          },
        },
      );

      return {
        products: response.data.products.map((product: any) => {
          const transformedProduct = {
            ...product,
            images: product.images.map((img: any) => ({
              ...img,
              url: img.url || img.image_url || "",
            })),
          };
          return ProductSchema.parse(transformedProduct);
        }),
        totalPages: response.data.total_pages,
        currentPage: response.data.page || page,
        total: response.data.total,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return { products: [], totalPages: 1, currentPage: 1, total: 0 };
    }
  },

  async getProductsCategoryFilter(game: string, category: string) {
    try {
      const response = await httpClient.get(`/products/${game}/${category}`);
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
      if (e instanceof ZodError) console.error(e.issues);
      return [];
    }
  },

  async createProduct(productData: any, uploadedImages: File[] = []) {
    try {
      const draftImagesFromPayload: string[] = Array.isArray(productData.draft_images)
        ? productData.draft_images
        : [];

      let draftImagesFromDirectUpload: string[] = [];
      let imagesForServerUpload: File[] = uploadedImages;

      if (uploadedImages.length > 0) {
        const directUploadEligibleFiles = uploadedImages.filter((file) =>
          DIRECT_UPLOAD_SUPPORTED_CONTENT_TYPES.has(file.type),
        );
        const directUploadIneligibleFiles = uploadedImages.filter(
          (file) => !DIRECT_UPLOAD_SUPPORTED_CONTENT_TYPES.has(file.type),
        );

        if (directUploadEligibleFiles.length > 0) {
          try {
            const presignPayload: ProductDirectUploadRequestPayload = {
              files: directUploadEligibleFiles.map((file) => ({
                filename: file.name,
                content_type: file.type,
                size: file.size,
              })),
            };

            const presignResponse = await httpClient.post<ProductDirectUploadResponsePayload>(
              "/products/uploads/presign",
              presignPayload,
              { timeout: UPLOAD_REQUEST_TIMEOUT_MS },
            );

            const uploads = presignResponse.data.uploads;
            if (uploads.length !== directUploadEligibleFiles.length) {
              throw new Error("Presigned uploads count mismatch");
            }

            await Promise.all(
              uploads.map((upload, index) =>
                axios.put(upload.upload_url, directUploadEligibleFiles[index], {
                  headers: {
                    "Content-Type": upload.content_type,
                  },
                  timeout: UPLOAD_REQUEST_TIMEOUT_MS,
                }),
              ),
            );

            draftImagesFromDirectUpload = uploads.map((upload) => upload.image_url);
            imagesForServerUpload = directUploadIneligibleFiles;
          } catch (directUploadError) {
            if (axios.isAxiosError(directUploadError)) {
              const errorCode =
                (directUploadError.response?.data as any)?.detail?.error_code
                || (directUploadError.response?.data as any)?.error_code;

              // For business validation errors fallback only adds latency.
              // Keep fallback only for local backend mode where presign is unavailable.
              if (errorCode && errorCode !== "WRONG_FILE_TYPE") {
                throw directUploadError;
              }
            }

            console.warn(
              "Direct S3 image upload failed, fallback to API multipart upload",
              directUploadError,
            );
            draftImagesFromDirectUpload = [];
            imagesForServerUpload = uploadedImages;
          }
        }
      }

      const formData = new FormData();
      formData.append("title", productData.title);
      formData.append("description", productData.description);
      formData.append("price", productData.price.toString());
      formData.append("price_currency", productData.price_currency || "RUB");
      if (
        typeof productData.product_data === "string" &&
        productData.product_data.trim().length > 0
      ) {
        formData.append("product_data", productData.product_data.trim());
      }
      if (productData.fortnite_account_details) {
        formData.append(
          "fortnite_account_details",
          JSON.stringify(productData.fortnite_account_details),
        );
      }
      if (typeof productData.draft_id === "string" && productData.draft_id.trim().length > 0) {
        formData.append("draft_id", productData.draft_id.trim());
      }
      formData.append("category_id", productData.category_id);
      formData.append("count", productData.count);
      formData.append("auto_delivery", productData.auto_delivery);
      formData.append("is_official", String(Boolean(productData.is_official)));

      [...draftImagesFromPayload, ...draftImagesFromDirectUpload].forEach(
        (imageUrl: string) => {
          formData.append("draft_images", imageUrl);
        },
      );

      imagesForServerUpload.forEach((image) => {
        formData.append("uploaded_images", image);
      });
      const response = await httpClient.post("/products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      return ProductSchema.parse(response.data);
    } catch (error) {
      console.error("Ошибка создания товара:", error);
      throw error;
    }
  },

  async updateProduct(
    productData: any,
    productId: string,
    uploadedImages: File[] = [],
    deletedImageIds: string[] = [],
  ) {
    try {
      const formData = new FormData();
      formData.append("product_id", productId);
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach((id: string | Blob) =>
          formData.append("deleted_images_ids", id),
        );
      }
      if (productData.title) formData.append("title", productData.title);
      if (productData.description)
        formData.append("description", productData.description);
      if (productData.price !== undefined && productData.price !== null)
        formData.append("price", productData.price.toString());
      formData.append("price_currency", productData.price_currency || "RUB");
      if (productData.auto_delivery && productData.product_data)
        formData.append("product_data", productData.product_data);
      if (productData.fortnite_account_details) {
        formData.append(
          "fortnite_account_details",
          JSON.stringify(productData.fortnite_account_details),
        );
      }
      if (productData.category_id)
        formData.append("category_id", productData.category_id);
      formData.append("auto_delivery", String(Boolean(productData.auto_delivery)));
      uploadedImages.forEach((image) => {
        formData.append("uploaded_images", image);
      });
      formData.append("count", productData.count);
      const response = await httpClient.patch("/products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      throw error;
    }
  },

  async addProductImages(formData: FormData) {
    try {
      const response = await httpClient.patch("/products/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error("Ошибка добавления изображений:", error);
      return false;
    }
  },

  async approveProduct(productId: string) {
    try {
      const response = await httpClient.post("/products/approve", {
        product_id: productId,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async buyProduct(
    productId: string,
  ): Promise<{ success: boolean; chatId?: string; error?: ApiError }> {
    try {
      const response = await httpClient.post(`/products/buy`, {
        product_id: productId,
      });
      return {
        success: true,
        chatId: response.data?.chat_room_id ?? undefined,
      };
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  },

  async createPriceOffer(
    productId: string,
    offeredPrice: number,
    message?: string,
  ): Promise<{ success: boolean; chatId?: string; error?: ApiError }> {
    try {
      const response = await httpClient.post(`/offers/products/${productId}`, {
        offered_price: offeredPrice,
        message: message?.trim() ? message.trim() : null,
      });
      return {
        success: true,
        chatId: response.data?.chat_room_id,
      };
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  },

  async acceptPriceOffer(
    offerId: string,
  ): Promise<{ success: boolean; dealId?: string; error?: ApiError }> {
    try {
      const response = await httpClient.patch(`/offers/${offerId}/accept`);
      return {
        success: true,
        dealId: response.data?.deal_id ?? undefined,
      };
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  },

  async rejectPriceOffer(
    offerId: string,
  ): Promise<{ success: boolean; error?: ApiError }> {
    try {
      await httpClient.patch(`/offers/${offerId}/reject`);
      return { success: true };
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  },

  async getProductByChatId(chatId: string) {
    try {
      const response = await httpClient.get(`/products/get/chat/${chatId}`);
      const transformedProduct = {
        ...response.data,
        images: response.data.images.map((img: any) => ({
          ...img,
          url: img.url || img.image_url || "",
        })),
      };
      return ProductSchema.parse(transformedProduct);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async confirmReceipt(dealId: string) {
    try {
      const response = await httpClient.patch(
        `/products/confirm-receipt/${dealId}`,
      );
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async confirmFulfillment(dealId: string) {
    try {
      const response = await httpClient.patch(
        `/deal/confirm-fulfillment/${dealId}`,
      );
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async getDealAutoCompleteDelaySeconds(): Promise<number | null> {
    try {
      const response = await httpClient.get(`/deal/auto-complete-delay`);
      const delaySeconds = Number(response.data?.delay_seconds);
      return Number.isFinite(delaySeconds) && delaySeconds > 0 ? delaySeconds : null;
    } catch {
      return null;
    }
  },

  async sendReport(
    dealId: string,
    reportReasonId: string,
    report_text: string | null,
  ) {
    try {
      const response = await httpClient.patch(`/deal/report/${dealId}`, {
        report_reason_id: reportReasonId,
        report_text: report_text,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async searchProducts(
    query: string,
    page: number,
    perPage: number,
    filters?: ProductsFilterParams,
  ): Promise<{
    products: Product[];
    currentPage: number;
    totalPages: number;
    total: number;
  }> {
    try {
      const response = await httpClient.get("/products/search", {
        params: {
          q: query,
          page,
          per_page: perPage,
          ...buildProductsFilterParams(filters),
        },
      });

      return {
        products: response.data.products.map((product: any) => {
          const transformedProduct = {
            ...product,
            images: product.images.map((img: any) => ({
              ...img,
              url: img.url || img.image_url || "",
            })),
          };
          return ProductSchema.parse(transformedProduct);
        }),
        currentPage: response.data.page || page,
        totalPages: response.data.total_pages,
        total: response.data.total,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return { products: [], currentPage: 1, totalPages: 1, total: 0 };
    }
  },

  async getUserProducts(userId: string) {
    try {
      const response = await httpClient.get(`/products/user/${userId}`);
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
      if (e instanceof ZodError) console.error(e.issues);
      return [];
    }
  },

  async getUserProductsByUsername(
    username: string,
    page = 1,
    perPage = 20,
    status?: string,
  ): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
  }> {
    try {
      const response = await httpClient.get(
        `/products/user/by-username/${username}`,
        {
          params: {
            page,
            per_page: perPage,
            status,
          },
        },
      );

      const products = response.data.products.map((product: any) => {
        const transformedProduct = {
          ...product,
          images: product.images.map((img: any) => ({
            ...img,
            url: img.url || img.image_url || "",
          })),
        };
        return ProductSchema.parse(transformedProduct);
      });

      return {
        products,
        total: response.data.total,
        totalPages: response.data.total_pages,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return {
        products: [],
        total: 0,
        totalPages: 1,
      };
    }
  },

  async deleteProduct(productId: string) {
    try {
      const response = await httpClient.delete(`/products/${productId}`);
      return response.status === 200 || response.status === 204;
    } catch (e) {
      console.error("Failed to delete product:", e);
      return false;
    }
  },

  async addProductToFavorite(product_id: string) {
    //
    // add product to favorite
    //
    try {
      const response = await httpClient.patch("/products/to-favorite", {
        product_id: product_id,
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  },


  async addProductLike(product_id: string) {
    //
    // add product like
    //
    try {
      const response = await httpClient.patch(
        `/products/add-like/${product_id}`,
      );
      return response.status === 200;
    } catch (e) {
      return false;
    }
  },

  async removeProductLike(productId: string) {
    //
    // remove product like
    //
    try {
      const response = await httpClient.patch(
        `/products/remove-like/${productId}`,
      );
      return response.status === 200;
    } catch (e) {
      return false;
    }
  },

  async getFavoritesProducts() {
    try {
      const response = await httpClient.get(`/products/favorites`);

      const productsData = response.data.products || response.data || [];

      const favoriteProducts = productsData.map((product: any) => {
        const transformedProduct = {
          ...product,
          images:
            product.images?.map((img: any) => ({
              ...img,
              url: img.url || img.image_url || "",
            })) || [],
        };
        return ProductSchema.parse(transformedProduct);
      });

      return {
        favoriteProducts,
        total: response.data.total || favoriteProducts.length,
        totalPages: response.data.total_pages || 1,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      console.error("Failed to get favorite products:", e);
      return {
        favoriteProducts: [],
        total: 0,
        totalPages: 1,
      };
    }
  },

  async getCommissionInterest() {
    //
    // get committion insterest
    //
    try {
      const response = await httpClient.get(`/deal/commission-interest`);
      return response.data;
    } catch (e) {
      console.error("error get commission interest");
    }
  },

  async RefundDeal(dealId: string) {
    //
    // refund deal
    //
    try {
      const response = await httpClient.patch(`/deal/refund/${dealId}`);
      return response.status === 200;
    } catch (e) {
      return false;
    }
  },
};
