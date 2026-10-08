import {
  LayoutDashboard,
  Radio,
  Siren,
  BrainCircuit,
  Bot,
  ListChecks,
  Wrench,
  ShieldCheck,
  KeyRound,
  ClipboardCheck,
  ScrollText,
  FileCheck2,
  Plug,
  Users,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Path relative to the locale root, e.g. "/overview". */
  href: string;
  /** Key into messages/{locale}/nav.json's `items`. */
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Key into messages/{locale}/nav.json's `groups`. */
  labelKey: string;
  items: NavItem[];
}

/**
 * Every Section 60 route this foundation phase stubs (Layout shell
 * requirement: "sidebar nav — stub links to all routes, even ones with no
 * real page yet"). Detail routes (`/agents/[id]`, etc.) are deliberately
 * not nav entries — they're reached from a list page's row, same as any
 * console. `/settings/*` sub-items render as a nested group under
 * Settings rather than their own top-level entries.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "monitoring",
    items: [
      { href: "/overview", labelKey: "overview", icon: LayoutDashboard },
      { href: "/live", labelKey: "live", icon: Radio },
    ],
  },
  {
    labelKey: "governance",
    items: [
      // The AI-system inventory is the register the rest of Governance
      // acts on — an agent, task or policy is always *about* one of these
      // — so it leads the group rather than opening a fourth category.
      // The existing Monitoring / Governance / Administration taxonomy is
      // otherwise untouched.
      { href: "/ai-systems", labelKey: "aiSystems", icon: BrainCircuit },
      { href: "/agents", labelKey: "agents", icon: Bot },
      { href: "/tasks", labelKey: "tasks", icon: ListChecks },
      { href: "/tools", labelKey: "tools", icon: Wrench },
      { href: "/policies", labelKey: "policies", icon: ShieldCheck },
      { href: "/authorization", labelKey: "authorization", icon: KeyRound },
      { href: "/approvals", labelKey: "approvals", icon: ClipboardCheck },
      { href: "/audit", labelKey: "audit", icon: ScrollText },
      { href: "/compliance", labelKey: "compliance", icon: FileCheck2 },
    ],
  },
  // ADR-010: the console governs any AI agent; SOC is the first starter
  // pack. Its screens keep working but sit under the pack, not the product.
  {
    labelKey: "socPack",
    items: [{ href: "/incidents", labelKey: "incidents", icon: Siren }],
  },
  {
    labelKey: "administration",
    items: [
      { href: "/integrations", labelKey: "integrations", icon: Plug },
      { href: "/users", labelKey: "users", icon: Users },
      { href: "/roles", labelKey: "roles", icon: UserCog },
      { href: "/settings", labelKey: "settings", icon: Settings },
    ],
  },
];

export const SETTINGS_SUB_ITEMS: NavItem[] = [
  { href: "/settings/security", labelKey: "settingsSecurity", icon: Settings },
  { href: "/settings/sso", labelKey: "settingsSso", icon: Settings },
  { href: "/settings/residency", labelKey: "settingsResidency", icon: Settings },
  { href: "/settings/ai", labelKey: "settingsAi", icon: Settings },
];
