/**
 * state.ts
 * --------------------------------------------------------------------
 * Modelos de estado del simulador: snapshot del CPU, snapshot de la
 * UI, trazas de ejecución. Mantener separado del motor permite
 * snapshots inmutables (útil para "undo" y para depuración).
 * --------------------------------------------------------------------
 */

import { MEMORY_WORDS, REGISTER_COUNT, STACK_DEPTH } from './isa';

/** Estado completo del CPU en un instante dado (snapshot inmutable). */
export interface CPUSnapshot {
  /** Banco de registros (R0..R7). */
  registers: Uint16Array;

  /** Memoria de programa (16 bits por palabra). */
  program: Uint16Array;

  /** Memoria de datos (16 bits por palabra, separada del programa). */
  dataMemory: Uint16Array;

  /** Pila (16 bits por entrada). */
  stack: Uint16Array;

  /** Stack Pointer: apunta a la próxima entrada libre (post-incremento). */
  sp: number;

  /** Program Counter: índice de la siguiente instrucción a ejecutar. */
  pc: number;

  /** Banderas de estado (flags). */
  flags: {
    zero: boolean;
    carry: boolean;
    negative: boolean;
    overflow: boolean;
  };

  /** Ciclos ejecutados (1 ciclo = 1 instrucción completada). */
  cycles: number;

  /** ¿La CPU está detenida? */
  halted: boolean;
}

/** Estado de la UI del simulador (separado del estado del CPU). */
export interface UISnapshot {
  status: 'idle' | 'running' | 'paused' | 'halted' | 'error';
  /** Velocidad de ejecución automática (ms por instrucción). 0 = paso a paso. */
  speedMs: number;
  /** Mensaje visible en la consola. */
  lastMessage: string;
  /** ¿Mostrar panel lateral? */
  showHex: boolean;
}

/** Entrada de la consola de trazas. */
export interface TraceEntry {
  cycle: number;
  pc: number;
  raw: number;
  mnemonic: string;
  operand: string;
  registersAfter: Uint16Array;
  flagsAfter: CPUSnapshot['flags'];
  note?: string;
}

/** Estado del ensamblador. */
export interface AssemblyResult {
  /** Programa binario listo para cargar en MEM. */
  program: Uint16Array;
  /** Tabla de etiquetas resueltas (mnemónico -> dirección). */
  symbols: Map<string, number>;
  /** Listado fuente -> binario (para mostrar en CodeView). */
  listing: SourceListing[];
  /** Errores fatales. Si hay al menos uno, `program` puede estar vacío. */
  errors: AssemblyError[];
  /** Warnings no fatales. */
  warnings: AssemblyWarning[];
}

/** Línea del listado fuente. */
export interface SourceListing {
  lineNo: number;
  address: number | null;   // null si no produce código
  raw: number | null;       // palabra de 16 bits
  source: string;
  label?: string;
  mnemonic?: string;
  operandStr?: string;
}

/** Error de ensamblado. */
export interface AssemblyError {
  lineNo: number;
  col: number;
  message: string;
  kind:
    | 'lex'
    | 'syntax'
    | 'unknown-mnemonic'
    | 'bad-operand'
    | 'bad-register'
    | 'unknown-label'
    | 'duplicate-label'
    | 'program-overflow'
    | 'imm-out-of-range';
}

/** Warning de ensamblado. */
export interface AssemblyWarning {
  lineNo: number;
  message: string;
}

/** Crea un snapshot "limpio" con todos los valores en cero. */
export function createInitialSnapshot(): CPUSnapshot {
  return {
    registers: new Uint16Array(REGISTER_COUNT),       // R0=0 por construcción
    program:   new Uint16Array(MEMORY_WORDS),
    dataMemory:new Uint16Array(MEMORY_WORDS),
    stack:     new Uint16Array(STACK_DEPTH),
    sp: 0,
    pc: 0,
    flags: { zero: false, carry: false, negative: false, overflow: false },
    cycles: 0,
    halted: false,
  };
}