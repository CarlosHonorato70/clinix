/**
 * Asaas Billing Integration
 * Gateway brasileiro com suporte a boleto, PIX e cartão.
 * Docs: https://docs.asaas.com
 *
 * Env vars necessárias:
 *   ASAAS_API_KEY — API key do Asaas
 *   ASAAS_BASE_URL — https://api.asaas.com/v3 (prod) ou https://sandbox.asaas.com/api/v3
 */

const BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'
const API_KEY = () => process.env.ASAAS_API_KEY || ''

async function asaasRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Asaas API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

/* ─── Customer (tenant) ─── */

interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
}

export async function createCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
}): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/* ─── Subscription ─── */

interface AsaasSubscription {
  id: string
  customer: string
  billingType: string
  value: number
  cycle: string
  status: string
  nextDueDate: string
}

export async function createSubscription(data: {
  customer: string // Asaas customer ID
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'
  value: number
  cycle: 'MONTHLY'
  nextDueDate: string // YYYY-MM-DD
  description: string
}): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await asaasRequest(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  })
}

export async function getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
}

/* ─── Webhook event types ─── */

export type AsaasWebhookEvent =
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_DELETED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_DELETED'

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent
  payment?: {
    id: string
    customer: string
    subscription: string
    value: number
    status: string
    dueDate: string
  }
  subscription?: {
    id: string
    customer: string
    status: string
  }
}
