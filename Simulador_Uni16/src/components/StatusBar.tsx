/**
 * StatusBar.tsx
 * --------------------------------------------------------------------
 * Barra superior que muestra, en formato "pill" (estilo SaaS moderno):
 *   - Estado de la CPU (idle / running / paused / halted / error)
 *   - PC, SP, contador de ciclos
 *   - Mensaje destacado de la última operación
 *
 * Cada métrica es un pill independiente con su label y valor
 * monoespaciado, replicando el patrón visual de dashboards modernos.
 * --------------------------------------------------------------------
 */

import React from 'react';
import { useCPU } from '../context/CPUContext';

// Mapa de estado -> etiqueta legible
const STATUS_LABEL: Record<string, string> = {
  idle:    'IDLE',
  running: 'RUNNING',
  paused:  'PAUSED',
  halted:  'HALTED',
  error:   'ERROR',
};

/**
 * Componente principal de la barra de estado.
 * Lee datos del contexto de CPU y los muestra en una fila de pills.
 */
export const StatusBar: React.FC = () => {
  const { state } = useCPU();
  const cpu = state.cpu;

  return (
    <div className="status-bar">
      {/* Estado actual (chip de color) */}
      <div className={`sb-status sb-status--${state.status}`}>
        {STATUS_LABEL[state.status] ?? state.status.toUpperCase()}
      </div>

      {/* PC */}
      <div className="sb-pill">
        <span className="sb-pill-label">PC</span>
        <span className="sb-pill-value">
          0x{(cpu?.pc ?? 0).toString(16).toUpperCase().padStart(3, '0')}
        </span>
      </div>

      {/* SP */}
      <div className="sb-pill">
        <span className="sb-pill-label">SP</span>
        <span className="sb-pill-value">
          0x{(cpu?.sp ?? 0).toString(16).toUpperCase().padStart(2, '0')}
        </span>
      </div>

      {/* Ciclos ejecutados */}
      <div className="sb-pill">
        <span className="sb-pill-label">CYCLES</span>
        <span className="sb-pill-value">{cpu?.cycles ?? 0}</span>
      </div>

      {/* Mensaje dinámico */}
      <div className="sb-msg" title={state.message}>
        {state.message}
      </div>
    </div>
  );
};