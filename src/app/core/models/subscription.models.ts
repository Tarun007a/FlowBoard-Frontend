export type SubscriptionPlan = 'BASIC' | 'PRO' | 'PREMIUM';

export interface SubscriptionRequestDto {
  plan: SubscriptionPlan;
}

export interface SubscriptionResponseDto {
  id: number;
  userId: number;
  plan: SubscriptionPlan;
  startDate: string;
  expiryDate: string;
  status: string;
}

export interface SubscriptionPlanResponseDto {
  durationDays: number;
  price: number;
}

export interface RazorPayResponseDto {
  status: string;
  message: string;
  orderId: string;
  amount: string;
  currency: string;
  keyId: string;
}

export interface PaymentVerificationDto {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  plan: SubscriptionPlan;
}