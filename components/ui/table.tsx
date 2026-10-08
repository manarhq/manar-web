"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Density: the three dimensions that make a table feel dense or roomy —
 * body row height, header row height, and cell padding — come from the
 * --density-* custom properties in app/globals.css, driven by
 * `html[data-density]`. Nothing in this file branches on the mode; the
 * tokens do. See the "Density" section of app/globals.css for the
 * contract, and components/manar/data-table.tsx for the row height that
 * pairs with the cell padding below.
 *
 * Cells are 8x12 comfortable and 4x8 compact. Pass `mono` to a TableCell that holds an
 * id, hash, action name or number: it renders in Plex Mono with tabular digits.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-line-strong", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-line-strong font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-line transition-colors hover:bg-subtle has-aria-expanded:bg-subtle aria-selected:bg-brand-soft data-[state=selected]:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-(--density-head-height) px-(--density-cell-padding-inline) text-start align-middle text-xs font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pe-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  mono = false,
  ...props
}: React.ComponentProps<"td"> & { mono?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-(--density-cell-padding-inline) py-(--density-cell-padding-block) align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
        mono && "font-data",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
