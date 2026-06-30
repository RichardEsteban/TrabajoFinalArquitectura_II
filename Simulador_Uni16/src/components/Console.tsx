/**
 * Console.tsx
 * --------------------------------------------------------------------
 * Consola de trazas: lista todas las instrucciones ejecutadas, una
 * por línea, con el formato:
 *
 *   #0042  PC=0x005  0x1005  LOAD  R1, 5    Z=0 N=0 C=0
 *
 * Características UX:
 *   - Autoscroll inteligente: si el usuario hace scroll arriba para
 *     inspeccionar el historial, el autoscroll se desactiva; se
 *     reactiva automáticamente cuando vuelve al fondo.
 *   - Warnings en línea (notas del CPU, p.ej. overflow de pila) se
 *     pintan en ámbar con un icono de advertencia.
 *   - El componente está memoizado: solo re-renderiza si cambia
 *     `state.trace.length` (optimización para Runs largos).
 * --------------------------------------------------------------------
 */

import React, { memo, useEffect, useRef } from 'react';
import { useCPU } from '../context/CPUContext';

const IconTerminal: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5"/>
    <path d="M5 6l2 2-2 2M9 10h3"/>
  </svg>
);

/** Componente principal de la consola de trazas. */
export const Console: React.FC = memo(() => {
  const { state } = useCPU();
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Si el usuario está al fondo, hacemos autoscroll; si no, respetamos su posición. */
  const followRef = useRef(true);

  // Autoscroll al fondo cuando entran nuevas entradas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !followRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [state.trace.length]);

  /** Detecta si el usuario está al fondo para activar/desactivar autoscroll. */
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    followRef.current = atBottom;
  };

  return (
    <div className="panel panel-console">
      <div className="panel-title">
        <span className="panel-title-text">
          <IconTerminal />
          Consola de trazas
        </span>
        <span className="panel-sub">{state.trace.length} entrada(s)</span>
      </div>
      <div className="console-scroll" ref={scrollRef} onScroll={onScroll}>
        {state.trace.length === 0 ? (
          <div className="console-empty">
            Sin instrucciones ejecutadas todavía. Pulsa <strong>Step</strong> o <strong>Run</strong>.
          </div>
        ) : (
          state.trace.map((t, i) => (
            <div
              key={i}
              className={'console-line' + (t.note ? ' console-line--note' : '')}
            >
              <span className="cl-cycle">#{String(t.cycle).padStart(4, '0')}</span>
              <span className="cl-pc">PC=0x{t.pc.toString(16).toUpperCase().padStart(3, '0')}</span>
              <span className="cl-raw">0x{(t.raw & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}</span>
              <span className="cl-mnem">{t.mnemonic}</span>
              <span className="cl-oper">{t.operand}</span>
              <span className="cl-state">
                Z={t.flagsAfter.zero ? '1' : '0'} N={t.flagsAfter.negative ? '1' : '0'} C={t.flagsAfter.carry ? '1' : '0'}
              </span>
              {t.note && <span className="cl-note">⚠ {t.note}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
});
Console.displayName = 'Console';