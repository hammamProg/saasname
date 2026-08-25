"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
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

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setSignedInUser(currentUser);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthConfigContext.Provider value={{ authEnabled }}>
      <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    </AuthConfigContext.Provider>
  );
}
