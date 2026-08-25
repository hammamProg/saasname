import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function isPaddleClientConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
}

export function getPaddleEnvironment(): "sandbox" | "production" {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "production"
    : "sandbox";
}

export function getPaddleCheckout(): Promise<Paddle | undefined> {
  if (!isPaddleClientConfigured()) {
    return Promise.resolve(undefined);
  }

  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment: getPaddleEnvironment(),
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!.trim(),
    });
  }

  return paddlePromise;
}
