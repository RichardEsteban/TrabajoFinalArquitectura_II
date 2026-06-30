/**
 * CPUContext.tsx
 * --------------------------------------------------------------------
 * Contexto global de React para el simulador UNI-16.
 *
 * Cambios recientes (v2):
 *   - timerId se guarda en un REF, no en estado, para que el cleanup
 *     de useEffect funcione correctamente bajo React.StrictMode
 *     (donde los efectos se montan/desmontan dos veces).
 *   - El trace se acota a MAX_TRACE_ENTRIES para evitar crecimiento
 *     ilimitado en Runs largos.
 *   - La velocidad se clampa a [10, 2000] ms; valores menores son
 *     reemplazados por Step manual.
 *   - El Run se detiene automáticamente si supera MAX_RUN_CYCLES sin
 *     encontrar HLT (protección contra loops infinitos).
 * --------------------------------------------------------------------
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { assemble } from '../core/assembler';
import { CPU } from '../core/cpu';
import type { AssemblyResult } from '../core/state';
import type { CPUSnapshot, TraceEntry } from '../core/state';
import { EXAMPLES, EXAMPLE_SUM } from '../examples/examples';

/* ============== CONSTANTES DE SEGURIDAD ============== */

const MAX_TRACE_ENTRIES = 500;          // tope de líneas en la consola
const MAX_RUN_CYCLES    = 50_000;      // tope de ciclos por Run (anti-loop)
const MIN_SPEED_MS      = 10;          // mínimo delay entre steps en Run
const MAX_SPEED_MS      = 2000;        // máximo delay
const DEFAULT_SPEED_MS  = 200;

/* ============== TIPOS DEL ESTADO ============== */

interface State {
  source: string;
  assembly: AssemblyResult | null;
  cpu: CPUSnapshot | null;
  trace: TraceEntry[];
  status: 'idle' | 'running' | 'paused' | 'halted' | 'error';
  lastStepId: number;
  message: string;
  speedMs: number;
  currentSourceLine: number | null;
}

type Action =
  | { type: 'set-source'; source: string }
  | { type: 'assemble'; assembly: AssemblyResult; cpu: CPUSnapshot | null }
  | { type: 'step'; entry: TraceEntry; cpu: CPUSnapshot; sourceLine: number | null }
  | { type: 'run-start'; speedMs: number }
  | { type: 'run-stop' }
  | { type: 'halt'; cpu: CPUSnapshot; entry: TraceEntry; message: string }
  | { type: 'reset'; cpu: CPUSnapshot | null; message?: string }
  | { type: 'set-speed'; speedMs: number }
  | { type: 'status'; status: State['status']; message?: string };

/* ============== REDUCER ============== */

function clampSpeed(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_SPEED_MS;
  return Math.max(MIN_SPEED_MS, Math.min(MAX_SPEED_MS, Math.floor(ms)));
}

const initialState: State = {
  source: EXAMPLE_SUM,
  assembly: null,
  cpu: null,
  trace: [],
  status: 'idle',
  lastStepId: -1,
  message: 'Listo. Presiona "Compilar" para ensamblar.',
  speedMs: DEFAULT_SPEED_MS,
  currentSourceLine: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-source':
      return { ...state, source: action.source };

    case 'assemble':
      return {
        ...state,
        assembly: action.assembly,
        cpu: action.cpu,
        trace: [],                              // limpiar trazas previas
        status: action.assembly.errors.length > 0 ? 'error' : 'idle',
        lastStepId: -1,
        message:
          action.assembly.errors.length > 0
            ? `Ensamblado falló: ${action.assembly.errors.length} error(es).`
            : `Ensamblado OK. ${action.assembly.program.length} instrucción(es).`,
        currentSourceLine: null,
      };

    case 'step': {
      // Acotar trace al último MAX_TRACE_ENTRIES (FIFO)
      const nextTrace = state.trace.length >= MAX_TRACE_ENTRIES
        ? [...state.trace.slice(state.trace.length - MAX_TRACE_ENTRIES + 1), action.entry]
        : [...state.trace, action.entry];
      return {
        ...state,
        cpu: action.cpu,
        trace: nextTrace,
        lastStepId: state.lastStepId + 1,
        currentSourceLine: action.sourceLine,
        message: `Step #${action.entry.cycle}: ${action.entry.mnemonic} ${action.entry.operand}`,
      };
    }

    case 'halt': {
      const nextTrace = state.trace.length >= MAX_TRACE_ENTRIES
        ? [...state.trace.slice(state.trace.length - MAX_TRACE_ENTRIES + 1), action.entry]
        : [...state.trace, action.entry];
      return {
        ...state,
        cpu: action.cpu,
        trace: nextTrace,
        status: 'halted',
        lastStepId: state.lastStepId + 1,
        message: action.message,
      };
    }

    case 'run-start':
      return { ...state, status: 'running', speedMs: action.speedMs, message: 'Ejecutando...' };

    case 'run-stop':
      return { ...state, status: 'paused', message: 'Ejecución pausada.' };

    case 'status':
      return { ...state, status: action.status, message: action.message ?? state.message };

    case 'reset':
      return {
        ...state,
        cpu: action.cpu,
        trace: [],
        lastStepId: -1,
        status: 'idle',
        currentSourceLine: null,
        message: action.message ?? 'CPU reiniciado.',
      };

    case 'set-speed':
      return { ...state, speedMs: clampSpeed(action.speedMs) };

    default:
      return state;
  }
}

/* ============== CONTEXTO ============== */

interface CPUContextValue {
  state: State;
  setSource(src: string): void;
  compile(): AssemblyResult;
  step(): void;
  run(): void;
  pause(): void;
  reset(): void;
  resetAll(): void;
  setSpeed(ms: number): void;
  loadExample(name: 'sum' | 'factorial' | 'fibonacci' | 'full'): void;
}

const CPUContext = createContext<CPUContextValue | null>(null);

/* ============== PROVIDER ============== */

export const CPUProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Motor de CPU persistente (no se re-crea en cada render)
  const cpuRef = useRef<CPU>(new CPU());

  // Timer ID en un REF (clave para que StrictMode cleanup funcione)
  const timerRef = useRef<number | null>(null);

  // Mantener siempre el último state accesible desde los callbacks
  // que viven fuera del ciclo de React (e.g. setInterval).
  const stateRef = useRef<State>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /* ===== helpers ===== */

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const ensureCPUForAssembly = useCallback((assembly: AssemblyResult): CPUSnapshot | null => {
    if (assembly.errors.length > 0 || assembly.program.length === 0) return null;
    cpuRef.current.resetAll();
    cpuRef.current.loadProgram(assembly.program);
    return cpuRef.current.getSnapshot();
  }, []);

  /* ===== acciones ===== */

  const compile = useCallback((): AssemblyResult => {
    // Parar cualquier Run en curso ANTES de tocar el CPU.
    stopTimer();
    const assembly = assemble(state.source);
    const cpu = ensureCPUForAssembly(assembly);
    dispatch({ type: 'assemble', assembly, cpu });
    return assembly;
  }, [state.source, ensureCPUForAssembly, stopTimer]);

  const dispatchStep = useCallback((entry: TraceEntry, cpu: CPUSnapshot) => {
    // Mapear PC -> línea fuente usando el último assembly conocido
    const asm = stateRef.current.assembly;
    const line = asm?.listing.find((l) => l.address === entry.pc)?.lineNo ?? null;
    if (cpu.halted) {
      dispatch({ type: 'halt', cpu, entry, message: `HLT alcanzado en PC=${entry.pc}.` });
    } else {
      dispatch({ type: 'step', entry, cpu, sourceLine: line });
    }
  }, []);

  const step = useCallback(() => {
    const entry = cpuRef.current.step();
    if (!entry) return;
    dispatchStep(entry, cpuRef.current.getSnapshot());
  }, [dispatchStep]);

  const run = useCallback(() => {
    // Si ya hay un timer, no iniciar otro.
    if (timerRef.current !== null) return;

    const asm = stateRef.current.assembly;
    if (!asm || asm.program.length === 0) {
      dispatch({ type: 'status', status: 'error', message: 'Nada que ejecutar. Compila primero.' });
      return;
    }

    // Clampear la velocidad al rango válido (defensa)
    const speed = clampSpeed(stateRef.current.speedMs);

    let cyclesThisRun = 0;

    const id = window.setInterval(() => {
      // ¿Sigue compilado el mismo programa? Si no, parar.
      const currentAsm = stateRef.current.assembly;
      if (!currentAsm || currentAsm.program.length === 0) {
        stopTimer();
        dispatch({ type: 'run-stop' });
        return;
      }

      const entry = cpuRef.current.step();
      if (!entry) {
        stopTimer();
        dispatch({ type: 'status', status: 'halted', message: 'CPU detenida.' });
        return;
      }
      const cpu = cpuRef.current.getSnapshot();
      dispatchStep(entry, cpu);

      cyclesThisRun += 1;
      if (cyclesThisRun >= MAX_RUN_CYCLES) {
        // Protección contra bucles infinitos del usuario.
        stopTimer();
        dispatch({
          type: 'status',
          status: 'error',
          message: `Límite de seguridad alcanzado (${MAX_RUN_CYCLES} ciclos sin HLT). Probable bucle infinito.`,
        });
        return;
      }
    }, speed);

    timerRef.current = id;
    dispatch({ type: 'run-start', speedMs: speed });
  }, [dispatchStep, stopTimer]);

  const pause = useCallback(() => {
    if (timerRef.current !== null) {
      stopTimer();
      dispatch({ type: 'run-stop' });
    }
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    const asm = stateRef.current.assembly;
    if (!asm || asm.program.length === 0) {
      cpuRef.current.resetAll();
      dispatch({ type: 'reset', cpu: cpuRef.current.getSnapshot(), message: 'CPU reiniciada.' });
      return;
    }
    cpuRef.current.resetAll();
    cpuRef.current.loadProgram(asm.program);
    dispatch({ type: 'reset', cpu: cpuRef.current.getSnapshot(), message: 'CPU reiniciada (programa conservado).' });
  }, [stopTimer]);

  const resetAll = useCallback(() => {
    stopTimer();
    cpuRef.current.resetAll();
    dispatch({ type: 'reset', cpu: cpuRef.current.getSnapshot(), message: 'CPU y programa reiniciados.' });
  }, [stopTimer]);

  const setSpeed = useCallback((ms: number) => {
    dispatch({ type: 'set-speed', speedMs: ms });
  }, []);

  const setSource = useCallback((src: string) => {
    dispatch({ type: 'set-source', source: src });
  }, []);

  const loadExample = useCallback((name: 'sum' | 'factorial' | 'fibonacci' | 'full') => {
    const src = EXAMPLES[name];
    if (src) setSource(src);
  }, [setSource]);

  /* ===== cleanup definitivo al desmontar ===== */
  useEffect(() => {
    return () => {
      // Al desmontar, parar el timer (sea StrictMode o no).
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const value: CPUContextValue = useMemo(() => ({
    state,
    setSource, compile, step, run, pause, reset, resetAll, setSpeed, loadExample,
  }), [state, setSource, compile, step, run, pause, reset, resetAll, setSpeed, loadExample]);

  return <CPUContext.Provider value={value}>{children}</CPUContext.Provider>;
};

/* ============== HOOK ============== */

export function useCPU(): CPUContextValue {
  const ctx = useContext(CPUContext);
  if (!ctx) throw new Error('useCPU debe usarse dentro de <CPUProvider>');
  return ctx;
}