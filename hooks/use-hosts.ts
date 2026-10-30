"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";

/**
 * Hosts, install keys, host groups, org units and approval rules (manar-api docs/hosts.md).
 * manar-api's controllers declare no response or body DTOs for these routes, so the generated
 * types are `never` there; the shapes below follow the Prisma records and each call casts at the
 * edge. The path literals stay type-checked, so a removed route still fails the build.
 */

export type HostStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
export type HostKeyType = "TPM" | "SOFTWARE";

export interface Host {
  id: string;
  hostGroupId: string;
  machineId: string;
  hostname: string;
  os: string;
  keyType: HostKeyType;
  status: HostStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  lastSeenAt: string | null;
  registeredFromIp: string;
  keyFingerprint: string;
  pendingKeyFingerprint: string | null;
  pendingHostGroupId: string | null;
  createdAt: string;
  /** The install key that enrolled it; the Add device screen matches the device it waits for by this. */
  installKeyId?: string | null;
}

export interface InstallKey {
  id: string;
  hostGroupId: string;
  label: string;
  allowedCidrs: string[];
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
}
/** The create response: the raw key is in this response only. */
export type CreatedInstallKey = InstallKey & { installKey: string };

export interface HostGroup {
  id: string;
  name: string;
  orgUnitId: string | null;
}
export interface OrgUnit {
  id: string;
  name: string;
  parentId: string | null;
  externalId: string | null;
  source: "MANUAL" | "ENTRA" | "AD";
}
export interface ApprovalRule {
  id: string;
  hostGroupId: string | null;
  hostnamePattern: string | null;
  cidrs: string[];
  requireTpm: boolean;
  enabled: boolean;
}

type Result = Promise<{ data?: unknown; error?: unknown }>;
async function unwrap<T>(call: Result): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data as T;
}
const path = (id: string) => ({ params: { path: { id } } });

export interface HostFilters {
  status?: HostStatus | "";
  hostGroupId?: string;
}

export function useHostsList(filters: HostFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["hosts", "list", filters.status ?? "", filters.hostGroupId ?? ""],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<CursorPage<Host>> =>
      normalizeCursorPage(
        await unwrap(
          apiClient.GET("/hosts", {
            params: {
              query: {
                status: filters.status || undefined,
                hostGroupId: filters.hostGroupId || undefined,
                limit: 50,
                cursor: pageParam,
              } as never,
            },
          }),
        ),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export type HostDecision = "approve" | "reject" | "revoke" | "remove";

/** Approve, reject or revoke. `keyFingerprint` is sent only when approving a pending rekey. */
export function useHostDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      keyFingerprint,
    }: {
      id: string;
      decision: HostDecision;
      keyFingerprint?: string;
    }) => {
      // "Remove device" deletes the record so the machine can be installed again.
      if (decision === "remove") {
        return unwrap<Host>(
          (apiClient as unknown as { DELETE: (u: string, o: unknown) => Result }).DELETE(
            "/hosts/{id}",
            path(id),
          ),
        );
      }
      const url = `/hosts/{id}/${decision}` as const;
      return unwrap<Host>(
        apiClient.POST(url, {
          ...path(id),
          body: (keyFingerprint ? { keyFingerprint } : {}) as never,
        }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosts"] }),
  });
}

function useList<T>(
  key: string,
  url: "/install-keys" | "/host-groups" | "/org-units" | "/host-approval-rules",
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["hosts", key],
    queryFn: () => unwrap<T[]>(apiClient.GET(url)),
    enabled,
  });
}
export const useInstallKeys = (enabled = true) =>
  useList<InstallKey>("install-keys", "/install-keys", enabled);
export const useHostGroups = (enabled = true) =>
  useList<HostGroup>("host-groups", "/host-groups", enabled);
export const useOrgUnits = (enabled = true) => useList<OrgUnit>("org-units", "/org-units", enabled);
export const useApprovalRules = (enabled = true) =>
  useList<ApprovalRule>("approval-rules", "/host-approval-rules", enabled);

export interface CreateInstallKeyInput {
  hostGroupId: string;
  label: string;
  allowedCidrs?: string[];
  maxUses?: number;
  expiresAt?: string;
}

/**
 * `POST /install-keys`. The raw key is in the response once. `gcTime: 0` drops the mutation
 * (and the key in it) as soon as nothing observes it; the dialog also calls `reset()` on close.
 */
export function useCreateInstallKey() {
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: (body: CreateInstallKeyInput) =>
      unwrap<CreatedInstallKey>(apiClient.POST("/install-keys", { body: body as never })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosts", "install-keys"] }),
  });
}

export function useRevokeInstallKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<InstallKey>(apiClient.POST("/install-keys/{id}/revoke", path(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosts", "install-keys"] }),
  });
}

function useSave<T, B>(
  create: "/host-groups" | "/org-units" | "/host-approval-rules",
  update: "/host-groups/{id}" | "/org-units/{id}" | "/host-approval-rules/{id}",
  key: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: B }) =>
      unwrap<T>(
        id
          ? apiClient.PATCH(update as never, { ...path(id), body: body as never } as never)
          : apiClient.POST(create, { body: body as never }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosts", key] }),
  });
}
export const useSaveHostGroup = () =>
  useSave<HostGroup, { name?: string; orgUnitId?: string | null }>(
    "/host-groups",
    "/host-groups/{id}",
    "host-groups",
  );
export const useSaveOrgUnit = () =>
  useSave<OrgUnit, { name?: string; parentId?: string | null }>(
    "/org-units",
    "/org-units/{id}",
    "org-units",
  );
export const useSaveApprovalRule = () =>
  useSave<ApprovalRule, Partial<Omit<ApprovalRule, "id">>>(
    "/host-approval-rules",
    "/host-approval-rules/{id}",
    "approval-rules",
  );
