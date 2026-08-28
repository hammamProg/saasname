"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { createClient } from "@/libs/supabase/client";

type AuthConfig = {
  authEnabled: boolean;
};

type AuthState = {
  user: User | null;
};

const AuthConfigContext = createContext<AuthConfig>({ authEnabled: false });
const AuthContext = createContext<AuthState>({ user: null });

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}

/** @deprecated use authEnabled */
export function useGoogleAuthEnabled() {
  const { authEnabled } = useAuthConfig();
  return authEnabled;
}

export function useUser() {
  const user = useContext(AuthContext).user;
  return { user, loading: false };
}

export default function Providers({
  children,
  authEnabled = false,
  initialUser = null,
}: {
  children: React.ReactNode;
  authEnabled?: boolean;
  initialUser?: User | null;
}) {
  // Auth being disabled is knowable during render, so the null user is derived
  // rather than written back through an effect on every mount.
  const [signedInUser, setSignedInUser] = useState<User | null>(initialUser);
  const identifiedUserId = useRef<string | null>(null);
  const user = authEnabled ? signedInUser : null;
  const supabase = useMemo(() => {
    if (!authEnabled) {
      return null;
    }
    return createClient();
  }, [authEnabled]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const identifyUser = (currentUser: User) => {
      if (identifiedUserId.current === currentUser.id) {
        return;
      }

      if (identifiedUserId.current) {
        posthog.reset();
      }

      const name = currentUser.user_metadata.full_name;
      posthog.identify(currentUser.id, {
        email: currentUser.email,
        ...(typeof name === "string" ? { name } : {}),
      });
      identifiedUserId.current = currentUser.id;
    };

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setSignedInUser(currentUser);
      if (currentUser) {
        identifyUser(currentUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setSignedInUser(currentUser);

      if (currentUser) {
        identifyUser(currentUser);
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        identifiedUserId.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthConfigContext.Provider value={{ authEnabled }}>
      <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    </AuthConfigContext.Provider>
  );
}
