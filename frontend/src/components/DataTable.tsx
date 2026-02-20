"use client";

import { ReactNode, useMemo, useState } from "react";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  searchValue?: (row: T) => string;
  className?: string;
  headerClassName?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
};

export type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey?: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
  searchPlaceholder?: string;
  initialSort?: SortState;
  pageSize?: number;
};

function normalizeSortValue(value: string | number | null | undefined): string | number {
  if (typeof value === "number") {
    return value;
  }

  return String(value ?? "").toLowerCase();
}

function compareSortValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "number") {
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  }

  if (typeof right === "number") {
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  }

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export default function DataTable<T>({
  rows,
  columns,
  getRowKey,
  loading = false,
  skeletonRows = 5,
  emptyState,
  searchPlaceholder = "Search...",
  initialSort,
  pageSize = 100,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sortedAndFilteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredRows = normalizedQuery
      ? rows.filter((row) =>
          columns.some((column) => {
            const searchableText =
              column.searchValue?.(row) ??
              (column.sortValue ? String(column.sortValue(row) ?? "") : "");

            return searchableText.toLowerCase().includes(normalizedQuery);
          }),
        )
      : rows;

    if (!sort) {
      return filteredRows;
    }

    const activeColumn = columns.find((column) => column.id === sort.columnId);
    if (!activeColumn?.sortValue) {
      return filteredRows;
    }

    const direction = sort.direction === "asc" ? 1 : -1;

    return [...filteredRows].sort((leftRow, rightRow) => {
      const leftValue = normalizeSortValue(activeColumn.sortValue?.(leftRow));
      const rightValue = normalizeSortValue(activeColumn.sortValue?.(rightRow));

      return compareSortValues(leftValue, rightValue) * direction;
    });
  }, [columns, query, rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedAndFilteredRows]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const onSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable || !column.sortValue) {
      return;
    }

    setSort((currentSort) => {
      if (!currentSort || currentSort.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }

      return {
        columnId: column.id,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  return (
    <div className="data-table-shell space-y-3">
      <div className="data-table-toolbar">
        <input
          className="input"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="table data-table w-full text-sm">
        <thead className="text-muted-foreground">
            <tr>
            {columns.map((column) => {
              const isSorted = sort?.columnId === column.id;
              const sortArrow = isSorted
                ? sort.direction === "asc"
                  ? " ↑"
                  : " ↓"
                : "";

              return (
                <th key={column.id} className={`px-4 py-3 text-left font-medium ${column.headerClassName ?? ""}`.trim()}>
                  <button
                    type="button"
                    onClick={() => onSortClick(column)}
                    disabled={!column.sortable || !column.sortValue}
                    className="text-left text-inherit"
                    style={{
                      background: "none",
                      border: 0,
                      color: "inherit",
                      cursor:
                        column.sortable && column.sortValue
                          ? "pointer"
                          : "default",
                      padding: 0,
                    }}
                  >
                    {column.header}
                    {sortArrow}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
                  <tbody className="divide-y divide-border/60">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                                <tr key={`skeleton-row-${rowIndex}`} className="hover:bg-accent/30">
                  {columns.map((column) => (
                                        <td key={`${column.id}-skeleton-${rowIndex}`} className="px-4 py-3">
                      <div className="skeleton" style={{ height: 16 }} />
                    </td>
                  ))}
                </tr>
              ))
            : paginatedRows.map((row, rowIndex) => (
                                <tr key={getRowKey?.(row, rowIndex) ?? `row-${rowIndex}`} className="hover:bg-accent/30">
                  {columns.map((column) => (
                                        <td key={`${column.id}-${rowIndex}`} className={`px-4 py-3 ${column.className ?? ""}`.trim()}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
          </table>
        </div>
      </div>

      {!loading && totalPages > 1 ? (
        <div className="data-table-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}
            -{Math.min(currentPage * pageSize, sortedAndFilteredRows.length)} of {sortedAndFilteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="button secondary"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="button secondary"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !sortedAndFilteredRows.length ? emptyState ?? null : null}
    </div>
  );
}
