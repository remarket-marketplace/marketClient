import axios from "axios";
import { ZodError } from "zod";
import { httpClient } from "..";
import { ProductSchema, type Product } from "@/validation/product/product";
import { ErrorHandler, type ApiError } from "../errorHandler";

const UPLOAD_REQUEST_TIMEOUT_MS = 120000;
const DIRECT_UPLOAD_SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/svg",
]);

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

function buildProductsFilterParams(filters?: ProductsFilterParams) {
  if (!filters) return {};

  const params: Record<string, string | number> = {};

  if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
  if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;
  if (filters.createdFrom) params.created_from = filters.createdFrom;
  if (filters.createdTo) params.created_to = filters.createdTo;

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
      formData.append("category_id", productData.category_id);
      formData.append("count", productData.count);
      formData.append("auto_delivery", productData.auto_delivery);

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
      return response.status >= 200 && response.status < 300;
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
