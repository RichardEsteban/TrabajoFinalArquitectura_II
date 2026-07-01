/**
 * ControlPanel.tsx
 * --------------------------------------------------------------------
 * Panel de control principal del simulador. Contiene:
 *   - Selector de ejemplos precargados
 *   - Botones de acción: Compilar, Step, Run/Pause, Reset, Reset Total
 *   - Slider de velocidad (10-1000 ms/step)
 *
 * Cada botón tiene un icono SVG inline (sin dependencias externas)
 * y un color semántico: violeta para acción primaria, verde para
 * ejecución OK, ámbar para pausar, rojo para reset total.
 * --------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { useCPU } from '../context/CPUContext';

/** Velocidad mínima del slider (ms/step). Por debajo de esto, setInterval
 *  genera una tormenta de callbacks que satura React -> OOM. */
const MIN_SPEED_MS = 10;
/** Velocidad máxima del slider. */
const MAX_SPEED_MS = 1000;

/* ---------- Iconos SVG inline (no usamos librería externa) ---------- */

const IconHammer: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 2.5l2 2-1 1-2-2-5 5-2-2 5-5-1-1 2-2 2 2z"/>
    <path d="M2 11l3 3"/>
  </svg>
);
const IconStep: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l8 5-8 5V3zm9 0h1v10h-1V3z"/></svg>
);
const IconPlay: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5l10 5.5-10 5.5V2.5z"/></svg>
);
const IconPause: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.5"/><rect x="9" y="3" width="3" height="10" rx="0.5"/></svg>
);
const IconReset: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/>
    <path d="M2 2v3.5h3.5"/>
  </svg>
);
const IconClose: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M4 4l8 8M12 4l-8 8"/>
  </svg>
);

/** Panel de control principal. */
export const ControlPanel: React.FC = () => {
  const { state, compile, step, run, pause, reset, resetAll, setSpeed, loadExample } = useCPU();

  const onCompile = useCallback(() => { compile(); }, [compile]);

  const isRunning = state.status === 'running';
  const hasProgram = state.assembly !== null && state.assembly.program.length > 0;
  const canStep = state.cpu !== null && !state.cpu.halted && !isRunning;
  const canRun  = hasProgram && !isRunning && state.speedMs >= MIN_SPEED_MS;

  /** Maneja el cambio del slider clampeando a [MIN, MAX]. */
  const onSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseInt(e.target.value, 10));
  };

  return (
    <div className="control-panel">
      {/* Selector de ejemplo */}
      <div className="cp-row">
        <label className="cp-label">Ejemplo:</label>
        <select
          className="cp-select"
          defaultValue="sum"
          onChange={(e) => loadExample(e.target.value as 'sum' | 'factorial' | 'fibonacci' | 'full')}
        >
          <option value="sum">Suma (a + b)</option>
          <option value="factorial">Factorial (a!)</option>
          <option value="fibonacci">Fibonacci (fib(a))</option>
          <option value="full">Completo (factorial(a) + fib(b))</option>
        </select>
      </div>

      {/* Botones principales */}
      <div className="cp-row">
        <button className="cp-btn cp-btn--primary" onClick={onCompile} title="Ensamblar (Ctrl+Enter)">
          <IconHammer /> Compilar
        </button>
        <button className="cp-btn" onClick={step} disabled={!canStep}>
          <IconStep /> Step
        </button>
        {isRunning ? (
          <button className="cp-btn cp-btn--warn" onClick={pause}>
            <IconPause /> Pausa
          </button>
        ) : (
          <button className="cp-btn cp-btn--ok" onClick={run} disabled={!canRun}>
            <IconPlay /> Run
          </button>
        )}
        <button className="cp-btn" onClick={reset} disabled={!state.cpu}>
          <IconReset /> Reset
        </button>
        <button className="cp-btn cp-btn--danger" onClick={resetAll}>
          <IconClose /> Reset Total
        </button>
      </div>

      {/* Slider de velocidad */}
      <div className="cp-row">
        <label className="cp-label">Velocidad:</label>
        <input
          type="range"
          className="cp-slider"
          min={MIN_SPEED_MS}
          max={MAX_SPEED_MS}
          step={10}
          value={state.speedMs}
          onChange={onSpeedChange}
        />
        <span className="cp-label">{state.speedMs} ms/step</span>
        <span className="cp-hint">usa Step para avance manual</span>
      </div>
    </div>
  );
};