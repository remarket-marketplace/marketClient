import { ZodError } from "zod";
import { httpClient } from "..";
import {
  balanceSchema,
  topUpBalanceResponse,
  transactionResponse,
  type Balance,
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

  async TopUpUserBalance(amount: number) {
    try {
      const response = await httpClient.post("/wallet/top-up-balance", {
        amount,
      });
      return topUpBalanceResponse.parse(response.data);
    } catch (e) {
      if (e instanceof ZodError) console.error(e.issues);
      return null;
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
};
