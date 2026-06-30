# Simulador UNI-16

Simulador didáctico de la CPU **UNI-16**, una arquitectura RISC de 16 bits diseñada para el curso de *Arquitectura de Computadoras II* de la **Universidad Nacional de Ingeniería (UNI)**.

---

## Características

- ✅ Ensamblador de dos pasadas con resolución de etiquetas y mensajes de error pedagógicos.
- ✅ Motor de CPU que implementa el ciclo Fetch → Decode → Execute → Writeback.
- ✅ 16 instrucciones: `NOP LOAD ADD SUB AND OR XOR LW SW BEQ BNE SUBI J PUSH POP HLT`.
- ✅ 8 registros de 16 bits (R0 cableado a 0).
- ✅ 256 palabras de memoria de programa + 256 de memoria de datos.
- ✅ Pila de 64 entradas con SP post-incremento.
- ✅ 4 flags: Z (zero), C (carry), N (negative), V (overflow).
- ✅ UI con React 18 + TypeScript + Vite. Tema oscuro, paneles re-render optimizados.
- ✅ Ejecución paso a paso, continua con velocidad ajustable, reset suave y total.

---

## Inicio rápido

```bash
cd uni16-simulator
npm install
npm run dev
```

Abre el navegador en `http://localhost:5173`. Verás un programa de ejemplo ("Suma 5+3") precargado. Pulsa **⛏ Compilar** y luego **▶▶ Run** para verlo ejecutar.

### Otros comandos

```bash
npm run build      # genera el bundle de producción en dist/
npm run preview    # sirve el bundle de producción localmente
npm run test       # ejecuta los tests con Vitest
npm run lint       # corre ESLint sobre el código
```

---

## Estructura del proyecto

```
uni16-simulator/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── cpu.svg
└── src/
    ├── main.tsx                       # Bootstrap React
    ├── App.tsx                        # Layout principal
    │
    ├── core/                          # Capa de dominio (sin React)
    │   ├── isa.ts                     # Definición de la ISA, opcodes, registros
    │   ├── state.ts                   # Modelos de snapshot (CPU, UI, trace)
    │   ├── assembler.ts               # Ensamblador de 2 pasadas + lexer + parser
    │   └── cpu.ts                     # Motor Fetch-Decode-Execute-Writeback
    │
    ├── context/                       # Capa de estado
    │   └── CPUContext.tsx             # useReducer + CPUProvider + useCPU()
    │
    ├── components/                    # Capa de presentación
    │   ├── StatusBar.tsx              # Estado del CPU en la parte superior
    │   ├── Editor.tsx                 # Editor de código fuente .asm
    │   ├── CodeView.tsx               # Listado fuente → código máquina
    │   ├── ControlPanel.tsx           # Botones Compilar / Step / Run / Reset
    │   ├── RegisterView.tsx           # Visor de R0..R7 + flags
    │   ├── MemoryView.tsx             # Visor de memoria de programa y datos
    │   ├── StackView.tsx              # Visor de pila con TOP destacado
    │   └── Console.tsx                # Trazas de ejecución
    │
    ├── examples/
    │   └── examples.ts                # Programas .asm de demostración
    │
    └── styles/
        └── index.css                  # Tema oscuro, paneles, badges de flags
```

---

## ISA de referencia rápida

| Mnemónico | Opcode | Formato | Operación |
|---|---|---|---|
| NOP   | 0x0 | –        | Sin operación |
| LOAD  | 0x1 | `Rd, imm6` | `R[rd] ← sext(imm6)` |
| ADD   | 0x2 | `Rd, Rs`  | `R[rd] ← R[rd] + R[rs]` |
| SUB   | 0x3 | `Rd, Rs`  | `R[rd] ← R[rd] - R[rs]` |
| AND   | 0x4 | `Rd, Rs`  | `R[rd] ← R[rd] AND R[rs]` |
| OR    | 0x5 | `Rd, Rs`  | `R[rd] ← R[rd] OR R[rs]` |
| XOR   | 0x6 | `Rd, Rs`  | `R[rd] ← R[rd] XOR R[rs]` |
| LW    | 0x7 | `Rd, Rs`  | `R[rd] ← MEM[R[rs]]` |
| SW    | 0x8 | `Rd, Rs`  | `MEM[R[rs]] ← R[rd]` |
| BEQ   | 0x9 | `addr12`  | Si Z=1, `PC ← addr` |
| BNE   | 0xA | `addr12`  | Si Z=0, `PC ← addr` |
| SUBI  | 0xB | `Rd, imm6`| `R[rd] ← R[rd] - sext(imm6)` |
| J     | 0xC | `addr12`  | `PC ← addr` |
| PUSH  | 0xD | `Rd`      | `Stack[SP++] ← R[rd]` |
| POP   | 0xE | `Rd`      | `R[rd] ← Stack[--SP]` |
| HLT   | 0xF | –        | Detener CPU |

**Inmediato:** 6 bits con signo (rango `[-32, +31]`). Para incrementar por 1, usar `SUBI R, -1`.

**Sin CALL/RET en esta ISA.** Las subrutinas se invocan con `J etiqueta`. La pila sirve para preservar registros entre secciones.

---

## Cómo usar el simulador

1. **Edita** código en el panel izquierdo (`.asm`).
2. **Compila** con `Ctrl+Enter` o el botón ⛏.
3. **Step** ejecuta una instrucción; observa cómo cambian registros, flags y la traza.
4. **Run** ejecuta en bucle hasta encontrar `HLT`. Ajusta la velocidad con el slider.
5. **Reset** mantiene el programa; **Reset Total** lo borra.

### Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+Enter` (o `Cmd+Enter` en Mac) | Compilar |
| (Hover sobre línea con error en el gutter) | Ver mensaje completo |

---

## Tests

Los tests viven al lado de cada archivo (`*.test.ts`). Por ejemplo:

```ts
// src/core/assembler.test.ts
import { describe, it, expect } from 'vitest';
import { assemble } from './assembler';

describe('assembler', () => {
  it('compila un LOAD inmediato', () => {
    const r = assemble('MAIN:\n  LOAD R1, 5\n  HLT\n');
    expect(r.errors).toHaveLength(0);
    expect(r.program[0]).toBe(0x1005);
    expect(r.program[1]).toBe(0xF000);
  });
});
```

Para ejecutarlos:

```bash
npm run test
```

---

