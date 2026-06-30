/**
 * App.tsx
 * --------------------------------------------------------------------
 * Componente raíz del simulador. Define la estructura visual
 * principal (header sticky, rejilla de paneles, footer) y monta
 * todos los componentes especializados dentro del `CPUProvider`.
 *
 * --------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { StatusBar }    from './components/StatusBar';
import { ControlPanel } from './components/ControlPanel';
import { Editor }       from './components/Editor';
import { CodeView }     from './components/CodeView';
import { RegisterView } from './components/RegisterView';
import { MemoryView }   from './components/MemoryView';
import { StackView }    from './components/StackView';
import { Console }      from './components/Console';
import { useCPU }       from './context/CPUContext';

/** Logo del CPU (chip cuadrado con pines). Se reutiliza en el header. */
const Logo: React.FC = () => (
  <div className="app-logo">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="16" height="16" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <rect x="11" y="3" width="2" height="3" rx="0.5" fill="white"/>
      <rect x="15" y="3" width="2" height="3" rx="0.5" fill="white"/>
      <rect x="19" y="3" width="2" height="3" rx="0.5" fill="white"/>
      <rect x="11" y="26" width="2" height="3" rx="0.5" fill="white"/>
      <rect x="15" y="26" width="2" height="3" rx="0.5" fill="white"/>
      <rect x="19" y="26" width="2" height="3" rx="0.5" fill="white"/>
      <text x="16" y="20" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="9" fontWeight="700">U16</text>
    </svg>
  </div>
);

/** Componente raíz del simulador. */
export const App: React.FC = () => {
  const { compile } = useCPU();
  const onCompile = useCallback(() => { compile(); }, [compile]);

  return (
    <div className="app-shell">
      {/* HEADER ----------------------------------------------------------- */}
      <header className="app-header">
        <div className="app-brand">
          <Logo />
          <div className="app-title">
            <span className="app-title-main">Simulador UNI-16</span>
            <span className="app-title-sub">CPU didáctica RISC de 16 bits</span>
          </div>
        </div>
        <div className="app-header-meta">
          <span className="app-tag"> Grupo 6</span>
        </div>
      </header>

      {/* BARRA DE ESTADO -------------------------------------------------- */}
      <main className="app-main">
        <StatusBar />

        {/* EDITOR + LISTADO ------------------------------------------------ */}
        <section className="grid grid-top">
          <Editor onCompile={onCompile} />
          <CodeView />
        </section>

        {/* PANEL DE CONTROL ----------------------------------------------- */}
        <ControlPanel />

        {/* REGISTROS / PILA / MEMORIAS ----------------------------------- */}
        <section className="grid grid-mid">
          <RegisterView />
          <StackView />
          <MemoryView kind="program" />
          <MemoryView kind="data" />
        </section>

        {/* CONSOLA DE TRAZAS --------------------------------------------- */}
        <section className="grid grid-bottom">
          <Console />
        </section>
      </main>

      {/* FOOTER ----------------------------------------------------------- */}
      <footer className="app-footer">
        UNI-16 · Trabajo Final de Arquitectura de Computadoras II · Universidad Nacional de Ingeniería · 2026
      </footer>
    </div>
  );
};