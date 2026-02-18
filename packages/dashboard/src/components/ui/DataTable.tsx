import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium text-gray-300 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-gray-200 ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
