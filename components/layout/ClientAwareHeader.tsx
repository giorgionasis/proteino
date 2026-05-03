"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

const SUPPRESS_HEADER = ["/notifications"];

interface Props {
  isRegistered:      boolean;
  notificationCount: number;
}

export function ClientAwareHeader({ isRegistered, notificationCount }: Props) {
  const pathname = usePathname();
  if (SUPPRESS_HEADER.includes(pathname)) return null;
  return <Header isRegistered={isRegistered} notificationCount={notificationCount} />;
}
