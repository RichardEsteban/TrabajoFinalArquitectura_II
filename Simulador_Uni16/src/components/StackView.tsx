/**
 * StackView.tsx
 * --------------------------------------------------------------------
 * Visor de la pila (LIFO) implementada como array de 64 entradas
 * de 16 bits. Muestra las últimas 16 entradas (de SP-1 hacia abajo)
 * con la cima destacada en ámbar y un marcador "TOP".
 *
 * Convención de pila (definida en el ISA):
 *   - SP apunta a la próxima entrada LIBRE.
 *   - PUSH: stack[sp++] = valor.
 *   - POP:  sp--; valor = stack[sp].
 * --------------------------------------------------------------------
 */

import React, { memo } from 'react';
import { useCPU } from '../context/CPUContext';
import { STACK_DEPTH } from '../core/isa';

/** Da formato hexadecimal de 4 dígitos (16 bits). */
function fmtHex(v: number): string {
  return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

const IconStack: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h10v2H3zM3 7h10v2H3zM3 10h10v2H3zM3 13h10"/>
  </svg>
);

/** Componente principal del visor de pila. */
export const StackView: React.FC = memo(() => {
  const { state } = useCPU();
  const stack = state.cpu?.stack;
  const sp = state.cpu?.sp ?? 0;

  // Mostrar las últimas 16 entradas, desde SP-1 hacia abajo
  const visible: { idx: number; v: number; isTop: boolean }[] = [];
  const limit = Math.min(STACK_DEPTH, 16);
  for (let i = Math.max(0, sp - 1); i >= Math.max(0, sp - limit); i--) {
    visible.push({ idx: i, v: stack ? stack[i] ?? 0 : 0, isTop: i === sp - 1 });
  }

  return (
    <div className="panel panel-stack">
      <div className="panel-title">
        <span className="panel-title-text">
          <IconStack />
          Pila
        </span>
        <span className="panel-sub">
          SP = 0x{sp.toString(16).toUpperCase()} · {sp}/{STACK_DEPTH}
        </span>
      </div>
      <div className="panel-body panel-body--flush">
        {visible.length === 0 ? (
          <div className="stack-empty">Pila vacía</div>
        ) : (
          <table className="stack-table">
            <tbody>
              {visible.map(({ idx, v, isTop }) => (
                <tr key={idx} className={'stack-row' + (isTop ? ' stack-row--top' : '')}>
                  <td className="stack-idx">[0x{idx.toString(16).toUpperCase()}]</td>
                  <td className="stack-val">{fmtHex(v)}</td>
                  <td className="stack-dec">{v}</td>
                  {isTop && <td className="stack-top-tag">TOP</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
StackView.displayName = 'StackView';