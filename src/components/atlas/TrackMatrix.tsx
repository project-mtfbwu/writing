import Link from "next/link";
import type { AtlasConcept, AtlasMatrixCell } from "@/types/atlas";
import {
  getMatrixColumns,
  getTrackRows,
  loadAtlasConfig,
} from "@/lib/atlas/catalog";

type TrackMatrixProps = {
  concepts: AtlasConcept[];
  cells: AtlasMatrixCell[];
};

export function TrackMatrix({ concepts, cells }: TrackMatrixProps) {
  const config = loadAtlasConfig();
  const rows = getTrackRows();
  const columns = getMatrixColumns();

  function cellConcepts(track: (typeof rows)[number], column: (typeof columns)[number]) {
    const cell = cells.find((item) => item.track === track && item.column === column);
    if (!cell) return [];
    return cell.conceptIds
      .map((id) => concepts.find((concept) => concept.id === id))
      .filter((concept): concept is AtlasConcept => Boolean(concept));
  }

  return (
    <section className="atlas-matrix" aria-label="Track matrix">
      <h2>Track Matrix</h2>
      <p className="atlas-muted">
        Rows are craft tracks. Columns are production passes. Empty cells mean no reviewed mapping
        yet — not an invented fill.
      </p>
      <div className="atlas-matrix__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Track</th>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {config.matrixColumnLabels[column]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((track) => (
              <tr key={track}>
                <th scope="row">{config.trackRowLabels[track]}</th>
                {columns.map((column) => {
                  const items = cellConcepts(track, column);
                  return (
                    <td key={column}>
                      {items.length === 0 ? (
                        <span className="atlas-muted">—</span>
                      ) : (
                        <ul>
                          {items.map((concept) => (
                            <li key={concept.id}>
                              <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
