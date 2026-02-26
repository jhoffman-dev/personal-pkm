"use client";

import { useMergeRefs } from "@floating-ui/react";

// basically Exclude<React.ClassAttributes<T>["ref"], string>
type UserRef<T> =
  | ((instance: T | null) => void)
  | React.RefObject<T | null>
  | null
  | undefined;

export const useComposedRef = <T extends HTMLElement>(
  libRef: React.RefObject<T | null>,
  userRef: UserRef<T>,
) => {
  return useMergeRefs([libRef, userRef]);
};

export default useComposedRef;
