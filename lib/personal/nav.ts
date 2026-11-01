import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ClipboardTextIcon,
  DesktopTowerIcon,
  GearIcon,
  HouseIcon,
  ScrollIcon,
  ShieldCheckIcon,
  SparkleIcon,
} from "@phosphor-icons/react/ssr";

export interface PersonalNavItem {
  /** Path relative to the locale root. */
  href: string;
  /** Key into messages/{locale}/personal.json `nav`. */
  labelKey: "home" | "approvals" | "devices" | "aiTools" | "activity" | "rules" | "settings";
  icon: PhosphorIcon;
}

/** The personal shell's nav. Devices reuses the hosts view; the other owners are in the BRIEF's
 * route table (ai-tools: coverage, rules: features, approvals: approvals). */
export const PERSONAL_NAV: PersonalNavItem[] = [
  { href: "/home", labelKey: "home", icon: HouseIcon },
  { href: "/approvals", labelKey: "approvals", icon: ClipboardTextIcon },
  { href: "/hosts", labelKey: "devices", icon: DesktopTowerIcon },
  { href: "/ai-tools", labelKey: "aiTools", icon: SparkleIcon },
  { href: "/activity", labelKey: "activity", icon: ScrollIcon },
  { href: "/rules", labelKey: "rules", icon: ShieldCheckIcon },
  { href: "/settings", labelKey: "settings", icon: GearIcon },
];

export const ADD_DEVICE_HREF = "/add-device";
