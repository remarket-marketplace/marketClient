import { ZodError } from 'zod'
import { httpClient } from '..'
import { balanceSchema, type Balance } from '@/validation/wallet/wallet'

export const walletService = {
  async getUserBalance(): Promise<Balance | null> {
    try {
        const response = await httpClient.get('/wallet/balance')
        const validatedData = balanceSchema.parse(response.data)
        return validatedData
    }
    catch (e) {
        if (e instanceof ZodError)
            console.error(e.issues)
        return null
    }
  },
}
