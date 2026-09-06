import { supabase } from "../supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type AuthSettings = {
  external?: Partial<Record<"google" | "apple", boolean>>;
};

export async function isOAuthProviderEnabled(provider: "google" | "apple") {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  });

  if (!response.ok) {
    throw new Error("Bells could not check the login provider configuration. Please try again.");
  }

  const settings = (await response.json()) as AuthSettings;
  return settings.external?.[provider] === true;
}

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      return supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri,
          queryParams: opts?.extraParams,
        },
      });
    },
  },
};
