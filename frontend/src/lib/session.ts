// Session cache ownership: login/signup call beginSession() so every query refetches
// under the new httpOnly cookie; sign-out MUST go through endSession() so the previous
// account's cached data never leaks into the next login on this browser.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";
import type { User } from "./types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User | null>("/auth/me"),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSession() {
  const qc = useQueryClient();
  return {
    beginSession: async () => {
      await qc.cancelQueries();
      await qc.resetQueries();
    },
    endSession: async () => {
      await apiPost("/auth/logout");
      await qc.cancelQueries();
      qc.clear();
      qc.setQueryData(["me"], null);
    },
  };
}
