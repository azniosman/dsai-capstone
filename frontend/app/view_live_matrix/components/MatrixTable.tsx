"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Database,
  Filter,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { LiveMatrixData } from "../types";

interface MatrixTableProps {
  data: LiveMatrixData[];
  isLoading: boolean;
}

type SortKey =
  | "year"
  | "sector"
  | "jobRole"
  | "skillCategory"
  | "demandIndex"
  | "supplyIndex"
  | "growthRate";
type SortDir = "asc" | "desc";

export default function MatrixTable({ data, isLoading }: MatrixTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("growthRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const processedData = useMemo(() => {
    let filtered = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.sector.toLowerCase().includes(q) ||
          row.jobRole.toLowerCase().includes(q) ||
          row.skillCategory.toLowerCase().includes(q),
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp =
        typeof aVal === "string"
          ? aVal.localeCompare(bVal as string)
          : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const visibleData = processedData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const exportCSV = () => {
    const headers = [
      "Year",
      "Sector",
      "Job Role",
      "Skill Category",
      "Demand Index",
      "Supply Index",
      "Growth Rate",
    ];
    const csvContent = [
      headers.join(","),
      ...processedData.map((row) =>
        [
          row.year,
          `"${row.sector}"`,
          `"${row.jobRole}"`,
          `"${row.skillCategory}"`,
          row.demandIndex,
          row.supplyIndex,
          row.growthRate,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "live-matrix-export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400 font-mono">
          <Database className="w-5 h-5 text-cyan-500" />
          MASTER DATA REPOSITORY
        </h2>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
            <input
              type="text"
              placeholder="Search roles or sectors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-black/40 border border-cyan-500/20 rounded-md py-1.5 pl-9 pr-4 text-sm text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            onClick={exportCSV}
            className="clay-btn px-4 py-1.5 text-sm flex items-center gap-2 bg-black/40 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Download className="w-4 h-4" /> EXPORT
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-cyan-500/20 bg-black/20">
        <table className="w-full text-left text-sm text-neutral-300">
          <thead className="text-xs uppercase bg-cyan-950/40 text-cyan-500 font-mono">
            <tr>
              {[
                { key: "year", label: "Year" },
                { key: "sector", label: "Sector" },
                { key: "jobRole", label: "Job Role" },
                { key: "skillCategory", label: "Category" },
                { key: "demandIndex", label: "Demand" },
                { key: "supplyIndex", label: "Supply" },
                { key: "growthRate", label: "Growth %" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 cursor-pointer hover:bg-cyan-900/40 transition-colors"
                  onClick={() => handleSort(col.key as SortKey)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-cyan-300" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-300" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-cyan-500/50 italic font-mono animate-pulse"
                >
                  Querying Databanks...
                </td>
              </tr>
            ) : visibleData.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-red-500/50 italic font-mono"
                >
                  No records matched the filter criteria.
                </td>
              </tr>
            ) : (
              visibleData.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-cyan-500/10 hover:bg-cyan-800/20 transition-colors group"
                >
                  <td className="px-4 py-3 font-mono text-cyan-500/70">
                    {row.year}
                  </td>
                  <td className="px-4 py-3">{row.sector}</td>
                  <td className="px-4 py-3 font-semibold text-cyan-100">
                    {row.jobRole}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {row.skillCategory}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {row.demandIndex.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {row.supplyIndex.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={
                        row.growthRate > 0
                          ? "text-green-400"
                          : row.growthRate < 0
                            ? "text-red-400"
                            : "text-neutral-500"
                      }
                    >
                      {row.growthRate > 0 && "+"}
                      {row.growthRate.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex justify-between items-center text-sm font-mono text-cyan-500/50">
          <div>
            Showing {(page - 1) * rowsPerPage + 1} to{" "}
            {Math.min(page * rowsPerPage, processedData.length)} of{" "}
            {processedData.length} entries
          </div>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-cyan-500/20 rounded disabled:opacity-30 hover:bg-cyan-500/10"
            >
              PREV
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-cyan-500/20 rounded disabled:opacity-30 hover:bg-cyan-500/10"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
