/**
 * Editor.tsx
 * --------------------------------------------------------------------
 * Editor de código fuente para el ensamblador UNI-16.
 *
 * Características:
 *   - Numeración de línea sincronizada con el scroll
 *   - Marcado en rojo de las líneas con errores de ensamblado
 *   - Atajo de teclado Ctrl/Cmd+Enter para compilar
 *   - Panel inferior con la lista completa de errores
 *   - Memoización agresiva del gutter para no re-pintar miles
 *     de <div> en cada keystroke (defensa anti-OOM)
 *
 * Props:
 *   - onCompile(): callback invocado al pulsar Compilar o el atajo.
 * --------------------------------------------------------------------
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useCPU } from '../context/CPUContext';

interface Props {
  /** Se invoca cuando el usuario pulsa Compilar o Ctrl/Cmd+Enter. */
  onCompile(): void;
}

/** Tope defensivo de líneas visibles en el gutter. */
const MAX_VISIBLE_LINES = 5000;

/**
 * Gutter memoizado: la rejilla de números de línea a la izquierda del
 * editor. Sólo se re-renderiza si cambia la cantidad de líneas o el
 * mapa de errores; los keystrokes que no afectan esos contadores no
 * lo repintan.
 */
const Gutter: React.FC<{
  lineCount: number;
  errorsByLine: Map<number, string[]>;
  scrollRef: React.RefObject<HTMLDivElement>;
}> = memo(({ lineCount, errorsByLine, scrollRef }) => {
  // Construir las filas del gutter memoizadas
  const rows = useMemo(() => {
    const visible = Math.min(lineCount, MAX_VISIBLE_LINES);
    const arr: { ln: number; hasErr: boolean; title: string | undefined }[] = [];
    for (let i = 0; i < visible; i++) {
      const ln = i + 1;
      const errs = errorsByLine.get(ln);
      arr.push({ ln, hasErr: !!errs, title: errs?.join('\n') });
    }
    if (lineCount > visible) {
      arr.push({ ln: -1, hasErr: false, title: `... ${lineCount - visible} líneas más` });
    }
    return arr;
  }, [lineCount, errorsByLine]);

  return (
    <div className="editor-gutter" ref={scrollRef}>
      {rows.map(({ ln, hasErr, title }) =>
        ln === -1 ? (
          <div key="more" className="gutter-line gutter-line--more">⋮</div>
        ) : (
          <div
            key={ln}
            className={'gutter-line' + (hasErr ? ' gutter-line--err' : '')}
            title={title}
          >
            {ln}
          </div>
        )
      )}
    </div>
  );
}, (prev, next) =>
  prev.lineCount === next.lineCount && prev.errorsByLine === next.errorsByLine
);
Gutter.displayName = 'EditorGutter';

/** Icono del título del panel. */
const IconCode: React.FC = () => (
  <svg className="panel-title-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4L2 8l3 4"/>
    <path d="M11 4l3 4-3 4"/>
    <path d="M9 3l-2 10"/>
  </svg>
);

/** Componente principal del editor. */
export const Editor: React.FC<Props> = ({ onCompile }) => {
  const { state, setSource } = useCPU();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterScrollRef = useRef<HTMLDivElement>(null);

  /** Manejador de cambios del textarea. */
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSource(e.target.value);
    },
    [setSource]
  );

  /** Sincroniza el scroll vertical del gutter con el del textarea. */
  const onScroll = useCallback(() => {
    const ta = taRef.current;
    const g = gutterScrollRef.current;
    if (ta && g) g.scrollTop = ta.scrollTop;
  }, []);

  /** Atajo de teclado Ctrl/Cmd+Enter para compilar. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onCompile();
    }
  };

  // Conteo de líneas para el gutter
  const lineCount = state.source.split('\n').length;

  // Mapa errores por línea (memoizado para no reconstruir en cada render)
  const errorsByLine = useMemo(() => {
    const m = new Map<number, string[]>();
    state.assembly?.errors.forEach((err) => {
      const arr = m.get(err.lineNo) ?? [];
      arr.push(err.message);
      m.set(err.lineNo, arr);
    });
    return m;
  }, [state.assembly]);

  return (
    <div className="panel panel-editor">
      <div className="panel-title">
        <span className="panel-title-text">
          <IconCode />
          Editor · UNI-16 ASM
        </span>
        <span className="panel-sub">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> compila
        </span>
      </div>

      <div className="editor-wrap">
        <Gutter
          lineCount={lineCount}
          errorsByLine={errorsByLine}
          scrollRef={gutterScrollRef}
        />
        <textarea
          ref={taRef}
          className="editor-textarea"
          spellCheck={false}
          value={state.source}
          onChange={onChange}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          placeholder="Escribe aquí tu programa en ensamblador UNI-16…"
        />
      </div>

      {/* Panel de errores (solo visible si hay errores) */}
      {state.assembly && state.assembly.errors.length > 0 && (
        <div className="editor-errors">
          <strong>Errores del ensamblador ({state.assembly.errors.length}):</strong>
          <ul>
            {state.assembly.errors.map((e, i) => (
              <li key={i}>
                <span className="err-line">L{e.lineNo}:{e.col}</span>
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};