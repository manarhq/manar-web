import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  BrainIcon,
  BroadcastIcon,
  CertificateIcon,
  DesktopTowerIcon,
  ClipboardTextIcon,
  GaugeIcon,
  GearIcon,
  KeyIcon,
  ListChecksIcon,
  PlugIcon,
  RobotIcon,
  ScrollIcon,
  ShieldCheckIcon,
  SirenIcon,
  SquaresFourIcon,
  UserGearIcon,
  UsersIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";

export interface NavItem {
  /** Path relative to the locale root, e.g. "/overview". */
  href: string;
  /** Key into messages/{locale}/nav.json's `items`. */
  labelKey: string;
  icon: PhosphorIcon;
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
      { href: "/overview", labelKey: "overview", icon: SquaresFourIcon },
      { href: "/live", labelKey: "live", icon: BroadcastIcon },
      { href: "/friction", labelKey: "friction", icon: GaugeIcon },
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
      { href: "/ai-systems", labelKey: "aiSystems", icon: BrainIcon },
      { href: "/agents", labelKey: "agents", icon: RobotIcon },
      { href: "/tasks", labelKey: "tasks", icon: ListChecksIcon },
      { href: "/tools", labelKey: "tools", icon: WrenchIcon },
      { href: "/policies", labelKey: "policies", icon: ShieldCheckIcon },
      { href: "/authorization", labelKey: "authorization", icon: KeyIcon },
      { href: "/approvals", labelKey: "approvals", icon: ClipboardTextIcon },
      { href: "/audit", labelKey: "audit", icon: ScrollIcon },
      { href: "/compliance", labelKey: "compliance", icon: CertificateIcon },
    ],
  },
  {
    labelKey: "fleet",
    items: [{ href: "/hosts", labelKey: "hosts", icon: DesktopTowerIcon }],
  },
  // ADR-010: the console governs any AI agent; SOC is the first starter
  // pack. Its screens keep working but sit under the pack, not the product.
  {
    labelKey: "socPack",
    items: [{ href: "/incidents", labelKey: "incidents", icon: SirenIcon }],
  },
  {
    labelKey: "administration",
    items: [
      { href: "/integrations", labelKey: "integrations", icon: PlugIcon },
      { href: "/users", labelKey: "users", icon: UsersIcon },
      { href: "/roles", labelKey: "roles", icon: UserGearIcon },
      { href: "/settings", labelKey: "settings", icon: GearIcon },
    ],
  },
];

export const SETTINGS_SUB_ITEMS: NavItem[] = [
  { href: "/settings/security", labelKey: "settingsSecurity", icon: GearIcon },
  { href: "/settings/sso", labelKey: "settingsSso", icon: GearIcon },
  { href: "/settings/residency", labelKey: "settingsResidency", icon: GearIcon },
  { href: "/settings/ai", labelKey: "settingsAi", icon: GearIcon },
  { href: "/settings/notifications", labelKey: "settingsNotifications", icon: GearIcon },
  { href: "/settings/profile", labelKey: "settingsProfile", icon: GearIcon },
  { href: "/settings/team", labelKey: "settingsTeam", icon: GearIcon },
  { href: "/settings/account", labelKey: "settingsAccount", icon: GearIcon },
  { href: "/settings/billing", labelKey: "settingsBilling", icon: GearIcon },
  { href: "/settings/ai-usage", labelKey: "settingsAiUsage", icon: GearIcon },
  { href: "/settings/privacy", labelKey: "settingsPrivacy", icon: GearIcon },
];
