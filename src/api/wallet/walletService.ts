import { ZodError } from "zod";
import { httpClient } from "..";
import { ErrorHandler, type ApiError } from "../errorHandler";
import {
  balanceSchema,
  topUpBalanceRequestSchema,
  topUpBalanceResponse,
  transactionResponse,
  walletHistoryResponse,
  type Balance,
  type WalletTopUpProvider,
  type WalletHistoryResponse,
} from "@/validation/wallet/wallet";

export const walletService = {
  async getUserBalance(): Promise<Balance | null> {
    try {
      const response = await httpClient.get("/wallet/balance");
      const validatedData = balanceSchema.parse(response.data);
      return validatedData;
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async TopUpUserBalance(amount: number, provider: WalletTopUpProvider) {
    try {
      const payload = topUpBalanceRequestSchema.parse({ amount, provider });
      const response = await httpClient.post("/wallet/top-up-balance", payload);
      return {
        data: topUpBalanceResponse.parse(response.data),
        error: null as ApiError | null,
      };
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return {
        data: null,
        error: ErrorHandler.handleApiError(e),
      };
    }
  },

  async GetTransactionsList(page: number, perPage: number) {
    try {
      const response = await httpClient.get("/wallet/transactions", {
        params: {
          page,
          per_page: perPage,
        },
      });
      return {
        transactions: response.data.transactions.map((transaction: any) => {
          return transactionResponse.parse(transaction)
        }),
        totalPages: response.data.total_pages,
        total: response.data.total,
      }
      
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },

  async getHistory(page = 1, perPage = 20): Promise<WalletHistoryResponse | null> {
    try {
      const response = await httpClient.get("/wallet/history", {
        params: { page, per_page: perPage },
      });
      return walletHistoryResponse.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
    }
  },
};
