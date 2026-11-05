import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the page's server work finishes; the sidebar and top bar are already there. */
export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
