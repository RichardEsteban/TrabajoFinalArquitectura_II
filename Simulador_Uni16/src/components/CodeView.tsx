/**
 * CodeView.tsx
 * --------------------------------------------------------------------
 * Visor del listado generado por el ensamblador. Para cada línea
 * fuente muestra:
 *   - número de línea
 *   - dirección de memoria asignada
 *   - palabra de 16 bits (hex)
 *   - mnemónico (desensamblado)
 *   - operandos
 *   - texto fuente original
 *
 * La fila apuntada por el PC se resalta con fondo ámbar para que el
 * usuario siga visualmente el flujo de ejecución.
 * --------------------------------------------------------------------
 */

import React, { memo } from 'react';
import { useCPU } from '../context/CPUContext';
import { decode } from '../core/cpu';
import { OPCODE_BY_NUMBER } from '../core/isa';

/** Icono del título del panel. */
const IconList: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h10M3 8h10M3 12h10"/>
    <circle cx="2" cy="4" r="0.5" fill="currentColor"/>
    <circle cx="2" cy="8" r="0.5" fill="currentColor"/>
    <circle cx="2" cy="12" r="0.5" fill="currentColor"/>
  </svg>
);

/** Componente principal del visor de listado. */
export const CodeView: React.FC = memo(() => {
  const { state } = useCPU();
  const asm = state.assembly;

  if (!asm) {
    return (
      <div className="panel panel-codeview">
        <div className="panel-title">
          <span className="panel-title-text">
            <IconList />
            Listado
          </span>
          <span className="panel-sub">sin compilar</span>
        </div>
        <div className="empty-state">
          Pulsa <strong>Compilar</strong> para ver el listado de tu programa.
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-codeview">
      <div className="panel-title">
        <span className="panel-title-text">
          <IconList />
          Listado
        </span>
        <span className="panel-sub">
          {asm.program.length} instr · {asm.symbols.size} símbolos
        </span>
      </div>
      <div className="codeview-scroll">
        <table className="codeview-table">
          <thead>
            <tr>
              <th>Línea</th>
              <th>Addr</th>
              <th>Máquina</th>
              <th>Mnemónico</th>
              <th>Operandos</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {asm.listing.map((row, i) => {
              const isCurrent = row.address !== null && row.address === state.cpu?.pc;
              // Desensamblado: convierte la palabra bruta a su mnemónico
              let disasm = '';
              if (row.raw !== null) {
                const d = decode(row.raw);
                const def = OPCODE_BY_NUMBER[d.opcode];
                disasm = def ? def.mnemonic : `?0x${d.opcode.toString(16)}`;
              }
              return (
                <tr
                  key={i}
                  className={
                    'cv-row' +
                    (isCurrent ? ' cv-row--current' : '') +
                    (row.raw === null ? ' cv-row--empty' : '')
                  }
                >
                  <td className="cv-line">{row.lineNo}</td>
                  <td className="cv-addr">
                    {row.address !== null
                      ? '0x' + row.address.toString(16).toUpperCase().padStart(3, '0')
                      : '—'}
                  </td>
                  <td className="cv-raw">
                    {row.raw !== null
                      ? (row.raw & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
                      : '----'}
                  </td>
                  <td className="cv-mnem">{disasm}</td>
                  <td className="cv-oper">{row.operandStr ?? ''}</td>
                  <td className="cv-src">{row.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
CodeView.displayName = 'CodeView';