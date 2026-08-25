"use client";

import { useUser } from "@/components/Providers";
import ButtonAccount from "@/components/ButtonAccount";
import ButtonSignin from "@/components/ButtonSignin";

type HeaderAuthProps = {
  className?: string;
};

export default function HeaderAuth({ className = "" }: HeaderAuthProps) {
  const { user } = useUser();

  if (user) {
    return <ButtonAccount />;
  }

  return (
    <ButtonSignin
      className={`!w-auto px-5 py-2.5 ${className}`}
      label="Get Started"
    />
  );
}
