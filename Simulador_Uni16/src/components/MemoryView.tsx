/**
 * MemoryView.tsx
 * --------------------------------------------------------------------
 * Visor de memoria. Puede mostrar la memoria de programa o la
 * memoria de datos según la prop `kind`. Formato: tabla de 3
 * columnas (Addr | Hex | Dec) con scroll vertical.
 *
 * En la memoria de programa, la fila correspondiente al PC se
 * resalta con un fondo ámbar para que el usuario vea dónde está
 * apuntando el contador de programa.
 * --------------------------------------------------------------------
 */

import React, { memo } from 'react';
import { useCPU } from '../context/CPUContext';
import { MEMORY_WORDS } from '../core/isa';

interface Props {
  /** Qué memoria se muestra: 'program' (ROM) o 'data' (RAM). */
  kind: 'program' | 'data';
  /** Cantidad máxima de filas visibles. Por defecto todas las 256. */
  maxRows?: number;
}

/** Da formato hexadecimal de 4 dígitos (16 bits). */
function fmtHex(v: number): string {
  return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

const IconProgram: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
    <path d="M5 5h6M5 8h6M5 11h4"/>
  </svg>
);
const IconData: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="4" rx="6" ry="2"/>
    <path d="M2 4v8c0 1.1 2.7 2 6 2s6-.9 6-2V4"/>
    <path d="M2 8c0 1.1 2.7 2 6 2s6-.9 6-2"/>
  </svg>
);

/** Componente principal del visor de memoria. */
export const MemoryView: React.FC<Props> = memo(({ kind, maxRows = 256 }) => {
  const { state } = useCPU();
  const mem = kind === 'program' ? state.cpu?.program : state.cpu?.dataMemory;
  const pc = state.cpu?.pc ?? -1;

  // Construir las filas de la tabla memoizadas
  const rows: { addr: number; v: number; isPC: boolean }[] = [];
  const limit = Math.min(MEMORY_WORDS, maxRows);
  for (let i = 0; i < limit; i++) {
    const v = mem ? mem[i] ?? 0 : 0;
    rows.push({ addr: i, v, isPC: kind === 'program' && i === pc });
  }

  const title = kind === 'program' ? 'Memoria de programa' : 'Memoria de datos';
  const subtitle = kind === 'program'
    ? `${pc} / ${limit}`
    : `${limit} palabras`;

  return (
    <div className="panel panel-memory">
      <div className="panel-title">
        <span className="panel-title-text">
          {kind === 'program' ? <IconProgram /> : <IconData />}
          {title}
        </span>
        <span className="panel-sub">{subtitle}</span>
      </div>
      <div className="mem-scroll">
        <table className="mem-table">
          <thead>
            <tr>
              <th>Addr</th>
              <th>Hex</th>
              <th>Dec</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ addr, v, isPC }) => (
              <tr key={addr} className={'mem-row' + (isPC ? ' mem-row--pc' : '')}>
                <td className="mem-addr">{addr.toString(16).toUpperCase().padStart(3, '0')}</td>
                <td className="mem-hex">{fmtHex(v)}</td>
                <td className="mem-dec">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
MemoryView.displayName = 'MemoryView';