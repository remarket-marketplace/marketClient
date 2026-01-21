import { ZodError } from "zod";
import { httpClient } from "..";
import { CategorySchema } from "@/validation/product/product";

export const categoryService = {
  async getCategory(game_id: string) {
    try {
      const response = await httpClient.get(`/categories/game/${game_id}`);
      return response.data.map((category: any) =>
        CategorySchema.parse(category)
      );
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return [];
    }
  },

  async getAllCategories(page = 1, perPage = 30) {
    try {
      const response = await httpClient.get("/categories/", {
        params: {
          page,
          per_page: perPage,
        },
      });

      return {
        categories: response.data.categories.map((cat: any) =>
          CategorySchema.parse(cat)
        ),
        currentPage: page,
        totalPages: response.data.total_pages,
      };
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      } else {
        console.error(e);
      }

      return {
        categories: [],
        currentPage: 1,
        totalPages: 1,
      };
    }
  },

  async getSubcategories(parentId: string, page = 1, perPage = 20) {
    try {
      const response = await httpClient.get(
        `/categories/subcategories/${parentId}`,
        {
          params: {
            page,
            per_page: perPage,
          },
        }
      );

      return {
        categories: response.data.categories.map((cat: any) =>
          CategorySchema.parse(cat)
        ),
        currentPage: response.data.current_page || page,
        totalPages: response.data.total_pages,
      };
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      console.error("Error loading subcategories:", e);
      return {
        categories: [],
        currentPage: 1,
        totalPages: 1,
      };
    }
  },

  async AddCategory(
    name: string,
    description: string,
    file: File,
    parentId?: string
  ) {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("uploaded_image", file);
      if (parentId) {
        formData.append("parent_category_id", parentId);
      }
      const response = await httpClient.post("admin/category", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.status === 200;
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues);
      }
      return false;
    }
  },
};
