import { ZodError } from "zod";
import { httpClient } from "..";
import { ProductSchema, type Product } from "@/validation/product/product";

export const productService = {
  async getAllProducts(page: number, perPage: number) {
    try {
      const response = await httpClient.get("/products/get/all", {
        params: { page, per_page: perPage },
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

  async getProductsByCategory(categoryId: string) {
    try {
      const response = await httpClient.get(`/products/category/${categoryId}`);
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
    deletedImageIds: string[] = []
  ) {
    try {
      const formData = new FormData();
      formData.append("product_id", productId);
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach((id: string | Blob) =>
          formData.append("deleted_images_ids", id)
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
      const response = await httpClient.post(`/products/buy`, {
        product_id: productId,
      });
      return response.status === 200;
    } catch {
      return false;
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
        `/products/confirm-receipt/${dealId}`
      );
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async sendReport(productId: string, refusalReasonId: string) {
    try {
      const response = await httpClient.patch(`/products/report`, {
        product_id: productId,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async searchProducts(query: string) {
    try {
      const response = await httpClient.get("/products/search", {
        params: { q: query },
      });
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

  async getUserProductsByUsername(username: string): Promise<Product[]> {
    try {
      const response = await httpClient.get(
        `/products/user/by-username/${username}`
      );
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

  async removeProductFromFavorites(product_id: string) {
    //
    // remove product from favorites
    //
    try {
      const response = await httpClient.patch(
        "/products/remove-from-favorites",
        {
          product_id: product_id,
        }
      );
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
        `/products/add-like/${product_id}`
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
        `/products/remove-like/${productId}`
      );
      return response.status === 200;
    } catch (e) {
      return false;
    }
  },

  async getFavoritesProducts() {
    //
    // get favorites products
    //
    try {
      const response = await httpClient.get(
        `/products/favorites`
      );
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
  }
};
