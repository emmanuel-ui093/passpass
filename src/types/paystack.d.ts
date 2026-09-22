declare module '@paystack/inline-js' {
  export default class PaystackPop {
    newTransaction(options: {
      key: string;
      email: string;
      amount: number;
      currency?: string;
      ref?: string;
      metadata?: Record<string, unknown>;
      onSuccess?: (transaction: { reference: string }) => void;
      onCancel?: () => void;
      onError?: (error: unknown) => void;
    }): void;
  }
}