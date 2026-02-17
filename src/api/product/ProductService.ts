import axios from "axios";
import { ZodError } from "zod";
import { httpClient } from "..";
import { ProductSchema, type Product } from "@/validation/product/product";
import { ErrorHandler } from "../errorHandler";

export interface ProductsFilterParams {
  minPrice?: number;
  maxPrice?: number;
}

function buildProductsFilterParams(filters?: ProductsFilterParams) {
  if (!filters) return {};

  const params: Record<string, string | number> = {};

  if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
  if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;

  return params;
}

export const productService = {
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
      const formData = new FormData();
      formData.append("title", productData.title);
      formData.append("description", productData.description);
      formData.append("price", productData.price.toString());
      formData.append("product_data", productData.product_data);
      formData.append("category_id", productData.category_id);
      formData.append("count", productData.count);
      formData.append("auto_delivery", productData.auto_delivery);
      uploadedImages.forEach((image) => {
        formData.append("uploaded_images", image);
      });
      const response = await httpClient.post("/products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.status === 200;
    } catch (error) {
      console.error("Ошибка создания товара:", error);
      return null;
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
      if (productData.price)
        formData.append("price", productData.price.toString());
      if (productData.product_data)
        formData.append("product_data", productData.product_data);
      if (productData.category_id)
        formData.append("category_id", productData.category_id);
      uploadedImages.forEach((image) => {
        formData.append("uploaded_images", image);
      });
      formData.append("count", productData.count);
      const response = await httpClient.patch("/products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      return null;
    }
  },

  async addProductImages(formData: FormData) {
    try {
      const response = await httpClient.patch("/products/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.status === 200;
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

  async buyProduct(productId: string) {
    try {
      await httpClient.post(`/products/buy`, {
        product_id: productId,
      });
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
    categoryId?: string,
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
          ...(categoryId ? { category_id: categoryId } : {}),
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
      return response.status === 200;
    } catch {
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
