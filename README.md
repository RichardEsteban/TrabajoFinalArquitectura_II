# Simulador UNI-16

Simulador didáctico de la CPU **UNI-16**, una arquitectura RISC de 16 bits diseñada para el curso de *Arquitectura de Computadoras II* de la *Universidad Nacional de Ingeniería (UNI)*.

---

## Guía paso a paso para ejecutarlo

### Paso 1 · Instalar Node.js (incluye npm)

Necesitas **Node.js 18 o superior** (recomendado 20 LTS o 22 LTS).

1. Ve a **<https://nodejs.org/en/download>** y descarga el instalador **LTS** de tu sistema operativo (Windows `.msi`, macOS `.pkg` o binario Linux).

Verifica la instalación abriendo una terminal nueva:

```bash
node -v    # debe decir v18.x o superior
npm -v     # debe decir 9.x o superior
```

---

### Paso 2 · Obtener el proyecto

**Si lo tienes como ZIP:** descomprímelo en una carpeta.

**Si lo clonas con Git:**
```bash
git clone https://github.com/RichardEsteban/TrabajoFinalArquitectura_II.git
```

---

### Paso 3 · Instalar dependencias

Abre la terminal **dentro de la carpeta `Simulador_Uni16/`** (la que contiene el `package.json`) y ejecuta:

```bash
npm install
```

Esto descarga `react`, `vite`, `vitest`, etc. en una subcarpeta `node_modules/`. Tarda de 30 segundos a unos minutos.

> 💡 Tip para llegar a la carpeta correcta desde el Explorador de Windows: abre la carpeta `Simulador_Uni16/`, escribe `cmd` en la barra de dirección y presiona Enter. Eso abre una terminal ya en esa ruta.

---

### Paso 4 · Arrancar el simulador

En la misma terminal, todavía **dentro de `Simulador_Uni16/`**, ejecuta:

```bash
npm run dev
```

Verás algo así:

```
  VITE v5.4.x  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

> ⚠️ No cierres esta terminal mientras estés usando el simulador, es la que sirve la app.

---

### Paso 5 · Abrir en el navegador

Abre **<http://localhost:5173/>** y verás el simulador con un programa precargado ("Suma 5+3"):

1. Pulsa **⛏ Compilar**.
2. Pulsa **▶▶ Run** para ejecutar.
3. Para detener el servidor: vuelve a la terminal del Paso 4 y presiona `Ctrl + C`.

---

## Comandos útiles

Todos se ejecutan **desde la carpeta `Simulador_Uni16/`**:

```bash
npm run dev       # servidor de desarrollo (hot-reload)
npm run build     # genera el bundle de producción en dist/
npm run preview   # sirve el bundle de dist/ localmente
npm run test      # ejecuta los tests unitarios con Vitest
```

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `'node' no se reconoce` | Node no está instalado o no está en el PATH. Vuelve al Paso 1 y reinstala; **cierra y abre una terminal nueva**. |
| `EACCES` en Linux/macOS al hacer `npm install` | No uses `sudo`. Configura un prefijo propio: `npm config set prefix '~/.npm-global'` y reintenta. |
| `EADDRINUSE :::5173` | El puerto está ocupado. Mata el proceso o usa otro: `npm run dev -- --port 5174`. |
| Pantalla en blanco en el navegador | Borra caché y reinstala: `rm -rf node_modules .vite && npm install && npm run dev`. |
| `npm install` corre en una carpeta equivocada | Asegúrate de estar **dentro de `Simulador_Uni16/`** (la que tiene `package.json`). Si haces `npm install` en la carpeta padre te dirá que no encuentra el `package.json`. |

---

## Estructura

```
Simulador_Uni16/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/cpu.svg
├── src/
│   ├── App.tsx, main.tsx
│   ├── core/        ← ISA, ensamblador, CPU (sin React)
│   ├── context/     ← Estado global (useReducer)
│   ├── components/  ← UI: Editor, Registers, Memory, Stack, Console...
│   ├── examples/examples.ts   ← Programas de ejemplo (.asm)
│   └── styles/index.css
```

## ISA de referencia rápida

| Mnemónico | Opcode | Formato | Operación |
|---|---|---|---|
| `NOP`  | `0x0` | –         | Sin operación |
| `LOAD` | `0x1` | `Rd, imm6` | `R[rd] ← sext(imm6)` |
| `ADD`  | `0x2` | `Rd, Rs`   | `R[rd] ← R[rd] + R[rs]` |
| `SUB`  | `0x3` | `Rd, Rs`   | `R[rd] ← R[rd] - R[rs]` |
| `AND`  | `0x4` | `Rd, Rs`   | `R[rd] ← R[rd] AND R[rs]` |
| `OR`   | `0x5` | `Rd, Rs`   | `R[rd] ← R[rd] OR R[rs]` |
| `XOR`  | `0x6` | `Rd, Rs`   | `R[rd] ← R[rd] XOR R[rs]` |
| `LW`   | `0x7` | `Rd, Rs`   | `R[rd] ← MEM[R[rs]]` |
| `SW`   | `0x8` | `Rd, Rs`   | `MEM[R[rs]] ← R[rd]` |
| `BEQ`  | `0x9` | `addr12`   | Si Z=1, `PC ← addr` |
| `BNE`  | `0xA` | `addr12`   | Si Z=0, `PC ← addr` |
| `SUBI` | `0xB` | `Rd, imm6` | `R[rd] ← R[rd] - sext(imm6)` |
| `J`    | `0xC` | `addr12`   | `PC ← addr` |
| `PUSH` | `0xD` | `Rd`       | `Stack[SP++] ← R[rd]` |
| `POP`  | `0xE` | `Rd`       | `R[rd] ← Stack[--SP]` |
| `HLT`  | `0xF` | –          | Detener CPU |

**Inmediato:** 6 bits con signo (rango `[-32, +31]`). Para `+1`, usar `SUBI R, -1`. Sin `CALL`/`RET`: las subrutinas se invocan con `J etiqueta` y la pila sirve para preservar registros.

## Tests

```bash
npm run test
```

Ejemplo de test:

```ts
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
