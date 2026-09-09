import { useState } from "react";
import { ChevronRight, Download, Filter, Search } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function HistoricalArchivesPage() {
  const [query, setQuery] = useState("");
  const records = [
    ["OSI-2388", "Kochi harbour", "12 Aug 2026", "Contained"],
    ["OSI-2374", "Mundra coast", "04 Aug 2026", "Resolved"],
    ["OSI-2351", "Paradip port", "28 Jul 2026", "Monitored"],
  ];
  const filtered = records.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="RECORDS / ARCHIVES"
        title="Historical incident archive"
        text="Search completed incidents, simulations and agency briefings."
        action={
          <button className="module-action">
            <Download size={16} /> Export records
          </button>
        }
      />
      <div className="archive-panel">
        <div className="archive-tools">
          <div>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search incident ID or location"
            />
          </div>
          <button>
            <Filter size={15} /> Filters
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Location</th>
              <th>Closed</th>
              <th>Outcome</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={cell} className={index === 3 ? "status-cell" : ""}>
                    {cell}
                  </td>
                ))}
                <td>
                  <ChevronRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dashboard>
  );
}
