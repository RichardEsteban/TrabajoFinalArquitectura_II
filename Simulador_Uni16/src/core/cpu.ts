/**
 * cpu.ts
 * --------------------------------------------------------------------
 * Motor de la CPU UNI-16. Implementa el ciclo clásico
 *   Fetch -> Decode -> Execute -> Writeback
 *
 *  - Modelo de datos: snapshot inmutable (CPUSnapshot). Cada step
 *    devuelve un *nuevo* snapshot, lo que permite a React detectar
 *    cambios por referencia y a la UI implementar "step-back" sin
 *    estado mutable compartido.
 *
 *  - El PC, SP y flags viven dentro del snapshot. La pila se modela
 *    como un Uint16Array de tamaño fijo; el SP apunta a la próxima
 *    entrada libre (post-incremento en PUSH, pre-decremento en POP).
 *
 *  - El despachador de instrucciones es un switch sobre `opcode`. Las
 *    máscaras y desplazamientos están centralizados en `decode*()`
 *    para que coincidan al 100% con la pasada 2 del ensamblador.
 *
 * --------------------------------------------------------------------
 */

import {
  OPCODE_BY_NUMBER,
  ZERO_REGISTER,
  STACK_DEPTH,
  MEMORY_WORDS,
  signExtend6,
} from './isa';
import type { CPUSnapshot, TraceEntry } from './state';
import { createInitialSnapshot } from './state';

/* ============== DECODIFICACIÓN ============== */

export interface DecodedInstruction {
  opcode: number;
  rd: number;          // registro destino (3 bits)
  rs: number;          // registro fuente (3 bits)
  imm6: number;        // inmediato 6 bits sin signo
  immSigned: number;   // inmediato 6 bits con signo
  addr12: number;      // dirección 12 bits
  raw: number;         // palabra de 16 bits original
}

export function decode(raw: number): DecodedInstruction {
  const opcode  = (raw >>> 12) & 0xF;
  const rd      = (raw >>>  9) & 0x7;
  const rs      = (raw >>>  6) & 0x7;
  const imm6    =  raw         & 0x3F;
  const addr12  =  raw         & 0xFFF;
  return {
    opcode, rd, rs, imm6,
    immSigned: signExtend6(imm6),
    addr12,
    raw,
  };
}

/* ============== MOTOR ============== */

export class CPU {
  /** Snapshot actual del CPU. */
  private state: CPUSnapshot;

  constructor() {
    this.state = createInitialSnapshot();
  }

  /** Devuelve una copia inmutable del estado. */
  getSnapshot(): CPUSnapshot {
    return this.state;
  }

  /** Carga un programa y reinicia el estado. */
  loadProgram(program: Uint16Array): void {
    const fresh = createInitialSnapshot();
    fresh.program.set(program.subarray(0, MEMORY_WORDS));
    this.state = fresh;
  }

  /** Reset sin recargar programa. */
  reset(): void {
    const prog = this.state.program;
    const data = this.state.dataMemory;
    const fresh = createInitialSnapshot();
    fresh.program.set(prog);
    fresh.dataMemory.set(data);
    this.state = fresh;
  }

  /** Reset total (incluyendo programa). */
  resetAll(): void {
    this.state = createInitialSnapshot();
  }

  /* ============== CICLO DE INSTRUCCIÓN ============== */

  /**
   * Ejecuta una instrucción y devuelve la traza resultante.
   * Si la CPU está halted, devuelve null.
   */
  step(): TraceEntry | null {
    const s = this.state;

    if (s.halted) return null;

    // ---- FETCH ----
    const pc = s.pc;
    const raw = s.program[pc] ?? 0;

    // ---- DECODE ----
    const inst = decode(raw);
    const def = OPCODE_BY_NUMBER[inst.opcode];

    // Snapshot "antes" para diffs
    const before = {
      regs: new Uint16Array(s.registers),
      flags: { ...s.flags },
    };

    // ---- EXECUTE + WRITEBACK ----
    let pcModified = false;
    let note: string | undefined;

    if (!def) {
      // Opcode reservado -> comportamiento "HALT" con error.
      s.halted = true;
      note = `Opcode 0x${inst.opcode.toString(16)} no implementado -> HALT`;
    } else {
      switch (def.mnemonic) {
        case 'NOP': {
          // nada
          break;
        }

        case 'HLT': {
          s.halted = true;
          break;
        }

        case 'LOAD': {
          // R[rd] = sext(imm6)
          if (inst.rd !== ZERO_REGISTER) {
            s.registers[inst.rd] = inst.immSigned & 0xFFFF;
          }
          this.updateFlags(s.registers[inst.rd]!);
          break;
        }

        case 'ADD': {
          if (inst.rd !== ZERO_REGISTER) {
            const a = s.registers[inst.rd]!;
            const b = s.registers[inst.rs]!;
            const sum = (a + b) & 0xFFFF;
            s.registers[inst.rd] = sum;
            this.updateFlags(sum, a + b > 0xFFFF);
          }
          break;
        }

        case 'SUB': {
          if (inst.rd !== ZERO_REGISTER) {
            const a = s.registers[inst.rd]!;
            const b = s.registers[inst.rs]!;
            const diff = (a - b) & 0xFFFF;
            s.registers[inst.rd] = diff;
            this.updateFlags(diff, a < b);
          }
          break;
        }

        case 'SUBI': {
          if (inst.rd !== ZERO_REGISTER) {
            const a = s.registers[inst.rd]!;
            const imm = inst.immSigned & 0xFFFF;
            const diff = (a - imm) & 0xFFFF;
            s.registers[inst.rd] = diff;
            this.updateFlags(diff, a < imm);
          }
          break;
        }

        case 'AND': {
          if (inst.rd !== ZERO_REGISTER) {
            const r = s.registers[inst.rd]! & s.registers[inst.rs]!;
            s.registers[inst.rd] = r;
            this.updateFlags(r);
          }
          break;
        }

        case 'OR': {
          if (inst.rd !== ZERO_REGISTER) {
            const r = s.registers[inst.rd]! | s.registers[inst.rs]!;
            s.registers[inst.rd] = r;
            this.updateFlags(r);
          }
          break;
        }

        case 'XOR': {
          if (inst.rd !== ZERO_REGISTER) {
            const r = s.registers[inst.rd]! ^ s.registers[inst.rs]!;
            s.registers[inst.rd] = r;
            this.updateFlags(r);
          }
          break;
        }

        case 'LW': {
          // R[rd] = MEM[R[rs]]
          const addr = s.registers[inst.rs]! & 0xFF;
          if (addr < MEMORY_WORDS) {
            const v = s.dataMemory[addr]!;
            if (inst.rd !== ZERO_REGISTER) s.registers[inst.rd] = v;
            this.updateFlags(v);
          } else {
            note = `LW: dirección fuera de rango (${addr})`;
          }
          break;
        }

        case 'SW': {
          // MEM[R[rs]] = R[rd]
          const addr = s.registers[inst.rs]! & 0xFF;
          if (addr < MEMORY_WORDS) {
            s.dataMemory[addr] = s.registers[inst.rd]!;
          } else {
            note = `SW: dirección fuera de rango (${addr})`;
          }
          break;
        }

        case 'BEQ': {
          if (s.flags.zero) {
            s.pc = inst.addr12;
            pcModified = true;
          }
          break;
        }

        case 'BNE': {
          if (!s.flags.zero) {
            s.pc = inst.addr12;
            pcModified = true;
          }
          break;
        }

        case 'J': {
          s.pc = inst.addr12;
          pcModified = true;
          break;
        }

        case 'PUSH': {
          if (s.sp >= STACK_DEPTH) {
            note = `PUSH: stack overflow (sp=${s.sp})`;
          } else {
            s.stack[s.sp] = s.registers[inst.rd]!;
            s.sp += 1;
          }
          break;
        }

        case 'POP': {
          if (s.sp === 0) {
            note = `POP: stack underflow`;
          } else {
            s.sp -= 1;
            const v = s.stack[s.sp]!;
            if (inst.rd !== ZERO_REGISTER) {
              s.registers[inst.rd] = v;
              this.updateFlags(v);
            }
          }
          break;
        }

        default: {
          // Mnemónico conocido pero no implementado en este simulador
          s.halted = true;
          note = `${def.mnemonic} no implementado -> HALT`;
        }
      }
    }

    // PC se incrementa salvo que la instrucción lo haya modificado
    if (!pcModified && !s.halted) {
      s.pc = (s.pc + 1) & 0xFFF;
    }

    s.cycles += 1;

    // Re-forzar R0 = 0 (defensa)
    s.registers[ZERO_REGISTER] = 0;

    return {
      cycle: s.cycles,
      pc,
      raw,
      mnemonic: def ? def.mnemonic : `?0x${inst.opcode.toString(16)}`,
      operand: def ? formatOperand(def.mnemonic, inst) : '',
      registersAfter: new Uint16Array(s.registers),
      flagsAfter: { ...s.flags },
      note,
    };
  }

  /* ============== FLAGS ============== */

  /** Actualiza Z, N en base al valor. Carry se calcula aparte si aplica. */
  private updateFlags(value: number, carry: boolean = false): void {
    const v = value & 0xFFFF;
    this.state.flags.zero = (v === 0);
    this.state.flags.negative = ((v & 0x8000) !== 0);
    this.state.flags.carry = carry;
    this.state.flags.overflow = false; // simplificado
  }
}

/* ============== FORMATEO DE OPERANDOS (para la consola) ============== */

function formatOperand(mnem: string, inst: DecodedInstruction): string {
  switch (mnem) {
    case 'NOP':
    case 'HLT':
    case 'RET':    // por si se reincorpora
      return '';
    case 'LOAD':
    case 'SUBI':
      return `R${inst.rd}, ${inst.immSigned}`;
    case 'ADD':
    case 'SUB':
    case 'AND':
    case 'OR':
    case 'XOR':
      return `R${inst.rd}, R${inst.rs}`;
    case 'LW':
      return `R${inst.rd}, [R${inst.rs}]`;
    case 'SW':
      return `[R${inst.rs}], R${inst.rd}`;
    case 'PUSH':
      return `R${inst.rd}`;
    case 'POP':
      return `R${inst.rd}`;
    case 'BEQ':
    case 'BNE':
    case 'J':
      return `0x${inst.addr12.toString(16).toUpperCase().padStart(3, '0')}`;
    default:
      return '';
  }
}