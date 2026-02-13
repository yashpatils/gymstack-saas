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

  return left.toString().localeCompare(right.toString());
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
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);

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
    <div className="space-y-3">
      <input
        className="input"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.columnId === column.id;
              const sortArrow = isSorted
                ? sort.direction === "asc"
                  ? " ↑"
                  : " ↓"
                : "";

              return (
                <th key={column.id} className={column.headerClassName}>
                  <button
                    type="button"
                    onClick={() => onSortClick(column)}
                    disabled={!column.sortable || !column.sortValue}
                    className="text-left"
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
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={`skeleton-row-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={`${column.id}-skeleton-${rowIndex}`}>
                      <div className="skeleton" style={{ height: 16 }} />
                    </td>
                  ))}
                </tr>
              ))
            : sortedAndFilteredRows.map((row, rowIndex) => (
                <tr key={getRowKey?.(row, rowIndex) ?? `row-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={`${column.id}-${rowIndex}`} className={column.className}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {!loading && !sortedAndFilteredRows.length ? emptyState ?? null : null}
    </div>
  );
}
