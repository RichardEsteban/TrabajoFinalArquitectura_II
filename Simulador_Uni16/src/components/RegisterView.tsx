/**
 * RegisterView.tsx
 * --------------------------------------------------------------------
 * Visor del banco de registros R0..R7 de la CPU. Cada fila muestra:
 *   - nombre del registro (R0..R7)
 *   - valor en hexadecimal (16 bits)
 *   - valor en decimal
 *   - rol documentado en el ISA
 *
 * Características visuales:
 *   - El último registro escrito se resalta con un fondo violeta que
 *     se desvanece lentamente (transición CSS).
 *   - Los registros con valor 0x0000 se muestran apagados (R0 está
 *     cableado a 0).
 *   - Una franja inferior muestra las 4 flags como pills: cuando
 *     una flag está activa se llena de violeta.
 * --------------------------------------------------------------------
 */

import React, { memo } from 'react';
import { REGISTER_NAMES, REGISTER_ROLES } from '../core/isa';
import { useCPU } from '../context/CPUContext';

/** Da formato hexadecimal de 4 dígitos (16 bits). */
function fmtHex(v: number): string {
  return '0x' + (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/** Icono del título del panel. */
const IconCpu: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="10" rx="1.5"/>
    <rect x="6" y="6" width="4" height="4" rx="0.5"/>
    <path d="M6 1v2M10 1v2M6 13v2M10 13v2M1 6h2M1 10h2M13 6h2M13 10h2"/>
  </svg>
);

/**
 * Determina cuál es el registro destino de la última instrucción
 * ejecutada (para resaltarlo). Devuelve -1 si no es una escritura
 * a registro (p.ej. HLT, saltos, J).
 */
function lastWrittenReg(mnemonic: string, operand: string): number {
  const tok = operand.trim().split(/[\s,]+/)[0];
  if (!tok) return -1;
  const m = /^R([0-7])$/.exec(tok);
  if (!m) return -1;
  // Mnemónicos que NO escriben a registro
  if (
    mnemonic === 'NOP' || mnemonic === 'HLT' ||
    mnemonic === 'J'   || mnemonic === 'BEQ' || mnemonic === 'BNE'
  ) return -1;
  return parseInt(m[1]!, 10);
}

/** Componente principal del visor de registros. */
export const RegisterView: React.FC = memo(() => {
  const { state } = useCPU();
  const regs = state.cpu?.registers;

  // Determinar el registro destacado (último escrito)
  const lastWriteReg = state.trace.length > 0
    ? lastWrittenReg(
        state.trace[state.trace.length - 1]!.mnemonic,
        state.trace[state.trace.length - 1]!.operand
      )
    : -1;

  return (
    <div className="panel panel-registers">
      <div className="panel-title">
        <span className="panel-title-text">
          <IconCpu />
          Registros
        </span>
        <span className="panel-sub">R0 · R7</span>
      </div>
      <div className="panel-body panel-body--flush">
        <table className="reg-table">
          <thead>
            <tr>
              <th>Reg</th>
              <th>Hex</th>
              <th>Dec</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {REGISTER_NAMES.map((name, i) => {
              const v = regs ? regs[i] ?? 0 : 0;
              const isZero = v === 0;
              const highlight = i === lastWriteReg;
              return (
                <tr
                  key={name}
                  className={
                    'reg-row' +
                    (highlight ? ' reg-row--write' : '') +
                    (isZero ? ' reg-row--zero' : '')
                  }
                >
                  <td className="reg-name">{name}</td>
                  <td className="reg-hex">{fmtHex(v)}</td>
                  <td className="reg-dec">{v}</td>
                  <td className="reg-role">{REGISTER_ROLES[i] ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Franja de flags Z / C / N / V */}
      <div className="flags">
        <span className={'flag ' + (state.cpu?.flags.zero ? 'flag-on' : '')}>Z</span>
        <span className={'flag ' + (state.cpu?.flags.carry ? 'flag-on' : '')}>C</span>
        <span className={'flag ' + (state.cpu?.flags.negative ? 'flag-on' : '')}>N</span>
        <span className={'flag ' + (state.cpu?.flags.overflow ? 'flag-on' : '')}>V</span>
        <span className="flag-label">flags</span>
      </div>
    </div>
  );
});
RegisterView.displayName = 'RegisterView';