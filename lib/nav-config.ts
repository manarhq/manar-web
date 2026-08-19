import {
  LayoutDashboard,
  Radio,
  Siren,
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
 * SOC console. `/settings/*` sub-items render as a nested group under
 * Settings rather than their own top-level entries.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "monitoring",
    items: [
      { href: "/overview", labelKey: "overview", icon: LayoutDashboard },
      { href: "/live", labelKey: "live", icon: Radio },
      { href: "/incidents", labelKey: "incidents", icon: Siren },
    ],
  },
  {
    labelKey: "governance",
    items: [
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
