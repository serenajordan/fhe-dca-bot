"use client";

import type { ReactNode } from "react";

import { InMemoryStorageProvider } from "../hooks/useInMemoryStorage";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
  );
}
