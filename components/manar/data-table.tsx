"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * TanStack Table v9 (a from-scratch rewrite of the classic v8 API this
 * package is best known for — `useReactTable`/`getCoreRowModel` do not
 * exist in v9; see `pnpm dlx @tanstack/intent@latest load
 * @tanstack/react-table#getting-started`, which is what this file is
 * built from) requires every column set to be created via a
 * `createColumnHelper` bound to one specific `tableFeatures(...)` object.
 * `dataTableFeatures`/`DataTableFeatures`/`createManarColumnHelper` below
 * are that one shared registration for every `DataTable` consumer — no
 * extra row-model features (sorting, filtering, ...) are registered yet,
 * since no page in this foundation phase needs them; a later phase adds
 * a feature here once a real page needs it, once, rather than each page
 * inventing its own `tableFeatures` call.
 */
const dataTableFeatures = tableFeatures({});
export type DataTableFeatures = typeof dataTableFeatures;

export function createManarColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

export type ManarColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;

export interface DataTableProps<TData extends RowData> {
  columns: ManarColumnDef<TData, unknown>[];
  data: TData[];
  /** Called when a row is activated (click/Enter) — typically a
   * router.push to the resource's detail route. */
  onRowClick?: (row: TData) => void;
  className?: string;
  /** Overrides the default "no results" copy (falls back to the shared
   * dataTable.empty translation key). */
  emptyMessage?: string;
}

/**
 * Manar's base data-table: density-tokened rows (comfortable/compact,
 * never oversized shadcn-demo padding),
 * tabular-numeric cells by convention, and a keyboard-and-RTL-safe row-
 * activation affordance. Every later phase's list view (agents, tasks,
 * tools, policies, approvals, audit, ...) composes this rather than
 * hand-rolling `<table>` markup or its own TanStack Table wiring.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  onRowClick,
  className,
  emptyMessage,
}: DataTableProps<TData>) {
  const t = useTranslations("dataTable");
  const table = useTable({ features: dataTableFeatures, columns, data });

  const rows = table.getRowModel().rows;

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-card", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-start text-xs font-medium text-muted-foreground"
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter") onRowClick(row.original);
                      }
                    : undefined
                }
                className={cn(
                  // Row height is the single most density-sensitive
                  // dimension in this console (44px comfortable / 36px
                  // compact — the brief's numbers). It is a token, not a
                  // utility, so this component is written once; see the
                  // "Density" section of app/globals.css.
                  "h-(--density-row-height) text-sm",
                  onRowClick && "cursor-pointer focus-visible:-outline-offset-2",
                )}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="text-start">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
