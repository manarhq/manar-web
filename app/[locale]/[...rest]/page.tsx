import { notFound } from "next/navigation";

/**
 * Any path under a locale that no route matches lands here, so the 404 is rendered per request in
 * the locale layout (app/[locale]/not-found.tsx). Without it Next serves its build-time
 * `_not-found` page, whose scripts carry no CSP nonce and are blocked by 'strict-dynamic'.
 */
export default function CatchAllNotFound(): never {
  notFound();
}
