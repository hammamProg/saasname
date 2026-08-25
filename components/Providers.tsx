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
  const [user, setUser] = useState<User | null>(initialUser);
  const supabase = useMemo(() => {
    if (!authEnabled) {
      return null;
    }
    return createClient();
  }, [authEnabled]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthConfigContext.Provider value={{ authEnabled }}>
      <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    </AuthConfigContext.Provider>
  );
}
