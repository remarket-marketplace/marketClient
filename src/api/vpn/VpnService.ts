import { httpClient } from '..'

export type ScopeVpnPlanId = 'month' | 'quarter' | 'halfyear' | 'year'
export type ScopeVpnOrderPlanId = ScopeVpnPlanId | 'trial'

export type ScopeVpnPlan = {
  id: ScopeVpnPlanId
  months: number
  devices: number
  duration_days: number
  price: number
}

export type ScopeVpnOrder = {
  id: string
  plan: ScopeVpnOrderPlanId
  months: number
  devices: number
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

  async purchase(payload: { months: number; devices: number }): Promise<ScopeVpnOrder> {
    const response = await httpClient.post('/vpn/purchase', {
      months: payload.months,
      devices: payload.devices,
    })
    return response.data as ScopeVpnOrder
  },

  async createTrial(): Promise<ScopeVpnOrder> {
    const response = await httpClient.post('/vpn/trial')
    return response.data as ScopeVpnOrder
  },
}
