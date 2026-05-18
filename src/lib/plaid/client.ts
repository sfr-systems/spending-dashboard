import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export type PlaidEnv = "sandbox" | "production";

const clients = new Map<PlaidEnv, PlaidApi>();

export function getActivePlaidEnv(): PlaidEnv {
  const env = (process.env.PLAID_ENV ?? "sandbox") as PlaidEnv;
  if (env !== "sandbox" && env !== "production") {
    throw new Error(`Unknown PLAID_ENV: ${env}`);
  }
  return env;
}

export function getPlaidClient(env: PlaidEnv = getActivePlaidEnv()): PlaidApi {
  const existing = clients.get(env);
  if (existing) return existing;

  const clientId = process.env.PLAID_CLIENT_ID;
  // Sandbox calls use the sandbox secret if provided; otherwise fall back to
  // PLAID_SECRET (useful for dev where only one secret is set).
  const secret =
    env === "sandbox"
      ? process.env.PLAID_SANDBOX_SECRET ?? process.env.PLAID_SECRET
      : process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }

  const basePath = PlaidEnvironments[env];

  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  const client = new PlaidApi(config);
  clients.set(env, client);
  return client;
}
