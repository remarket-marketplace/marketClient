import { httpClient } from '..'

export type ScopeVpnPlanId = 'month' | 'quarter' | 'halfyear'
export type ScopeVpnOrderPlanId = ScopeVpnPlanId | 'trial'

export type ScopeVpnPlan = {
  id: ScopeVpnPlanId
  duration_days: number
  price: number
}

export type ScopeVpnOrder = {
  id: string
  plan: ScopeVpnOrderPlanId
  duration_days: number
  price: number
  subscription_url: string
  chat_room_id: string
  deal_id: string
  balance: number
  is_trial: boolean
  created_at: string
}

export const vpnService = {
  async getPlans(): Promise<ScopeVpnPlan[]> {
    const response = await httpClient.get('/vpn/plans')
    return Array.isArray(response.data?.plans) ? response.data.plans : []
  },

  async purchase(planId: ScopeVpnPlanId): Promise<ScopeVpnOrder> {
    const response = await httpClient.post('/vpn/purchase', {
      plan_id: planId,
    })
    return response.data as ScopeVpnOrder
  },

  async createTrial(): Promise<ScopeVpnOrder> {
    const response = await httpClient.post('/vpn/trial')
    return response.data as ScopeVpnOrder
  },
}
