/**
 * isa.ts
 * --------------------------------------------------------------------
 * Definición de la ISA (Instruction Set Architecture) del procesador
 * didáctico UNI-16.
 *
 * Esta capa es la "única fuente de verdad" compartida entre:
 *   - assembler.ts  (codifica mnemónicos -> opcode/operando)
 *   - cpu.ts        (decodifica opcode/operando -> operación)
 *   - UI (muestra nombres, formato, etc.)
 *
 * Cualquier cambio aquí debe reflejarse de forma sincronizada en
 * los tres módulos.
 * --------------------------------------------------------------------
 */

/* ============== PARÁMETROS ARQUITECTÓNICOS ============== */

export const WORD_SIZE = 16;            // bits por instrucción
export const REGISTER_COUNT = 8;        // R0..R7
export const MEMORY_WORDS = 256;        // palabras de 16 bits
export const STACK_DEPTH = 64;          // entradas de pila (palabras)
export const MAX_INSTRUCTIONS = MEMORY_WORDS;

/** R0 está cableado a 0x0000, no puede escribirse. */
export const ZERO_REGISTER = 0;

/** Opcode tiene 4 bits -> 16 opcodes posibles (8 usado, 8 libres). */
export const OPCODE_BITS = 4;
export const OPCODE_MASK = 0xF;

/* ============== FORMATOS DE INSTRUCCIÓN ============== */

/**
 * Formato Tipo R (Registro-Registro):
 *   [15-12]=opcode | [11-9]=Rd | [8-6]=Rs | [5-0]=sin uso
 *
 * Formato Tipo I (Inmediato):
 *   [15-12]=opcode | [11-9]=Rd | [8-6]=sin uso | [5-0]=inmediato (signo)
 *
 * Formato Tipo J (Salto):
 *   [15-12]=opcode | [11-0]=dirección (12 bits, palabra-direccionable)
 */

/* ============== TIPOS DE INSTRUCCIÓN ============== */

/** Categoría funcional (sólo para documentación / UI). */
export type InstrCategory =
  | 'data'
  | 'arith'
  | 'logic'
  | 'flow'
  | 'stack'
  | 'special';

/** Forma del operando. */
export type OperandShape =
  | 'none'        // NOP, HLT, RET
  | 'reg'         // INC Rd, DEC Rd, PUSH Rd, POP Rd, NOT Rd
  | 'reg-reg'     // ADD Rd,Rs  SUB Rd,Rs  AND Rd,Rs ...
  | 'reg-imm'     // LOAD Rd,imm  SUBI Rd,imm
  | 'addr'        // J addr, BEQ addr, BNE addr, CALL addr
  | 'mem-reg'     // LW Rd,Rs    SW Rd,Rs
  | 'reg-mem';    // (reservado para LW con base)

/** Descriptor de un opcode. */
export interface OpcodeDef {
  opcode: number;            // 0..15
  mnemonic: string;          // "ADD", "BEQ", ...
  category: InstrCategory;
  shape: OperandShape;
  description: string;       // para mostrar en UI / informe
}

/* ============== TABLA DE OPCODES (16 disponibles) ============== */

export const OPCODES: Record<string, OpcodeDef> = {
  NOP:   { opcode: 0x0, mnemonic: 'NOP',   category: 'special', shape: 'none',
           description: 'No operation. PC avanza sin afectar el estado.' },
  LOAD:  { opcode: 0x1, mnemonic: 'LOAD',  category: 'data',    shape: 'reg-imm',
           description: 'Carga un inmediato de 6 bits (signo) en Rd.' },
  ADD:   { opcode: 0x2, mnemonic: 'ADD',   category: 'arith',   shape: 'reg-reg',
           description: 'Rd <- Rd + Rs. Actualiza flags Z, C, N.' },
  SUB:   { opcode: 0x3, mnemonic: 'SUB',   category: 'arith',   shape: 'reg-reg',
           description: 'Rd <- Rd - Rs. Actualiza flags Z, C, N.' },
  AND:   { opcode: 0x4, mnemonic: 'AND',   category: 'logic',   shape: 'reg-reg',
           description: 'Rd <- Rd AND Rs (bit a bit).' },
  OR:    { opcode: 0x5, mnemonic: 'OR',    category: 'logic',   shape: 'reg-reg',
           description: 'Rd <- Rd OR Rs (bit a bit).' },
  XOR:   { opcode: 0x6, mnemonic: 'XOR',   category: 'logic',   shape: 'reg-reg',
           description: 'Rd <- Rd XOR Rs (bit a bit).' },
  LW:    { opcode: 0x7, mnemonic: 'LW',    category: 'data',    shape: 'mem-reg',
           description: 'Rd <- MEM[Rs]. Carga desde memoria de datos.' },
  SW:    { opcode: 0x8, mnemonic: 'SW',    category: 'data',    shape: 'mem-reg',
           description: 'MEM[Rs] <- Rd. Almacena en memoria de datos.' },
  BEQ:   { opcode: 0x9, mnemonic: 'BEQ',   category: 'flow',    shape: 'addr',
           description: 'Si Z=1 entonces PC <- addr (salto si igual).' },
  BNE:   { opcode: 0xA, mnemonic: 'BNE',   category: 'flow',    shape: 'addr',
           description: 'Si Z=0 entonces PC <- addr (salto si distinto).' },
  SUBI:  { opcode: 0xB, mnemonic: 'SUBI',  category: 'arith',   shape: 'reg-imm',
           description: 'Rd <- Rd - imm. Actualiza flags.' },
  J:     { opcode: 0xC, mnemonic: 'J',     category: 'flow',    shape: 'addr',
           description: 'PC <- addr (salto incondicional).' },
  PUSH:  { opcode: 0xD, mnemonic: 'PUSH',  category: 'stack',   shape: 'reg',
           description: 'Stack[SP++] <- Rs (apila registro).' },
  POP:   { opcode: 0xE, mnemonic: 'POP',   category: 'stack',   shape: 'reg',
           description: 'Rd <- Stack[--SP] (desapila en registro).' },
  HLT:   { opcode: 0xF, mnemonic: 'HLT',   category: 'special', shape: 'none',
           description: 'Detiene la CPU. PC deja de avanzar.' },
};

/** Acceso rápido por número de opcode. */
export const OPCODE_BY_NUMBER: OpcodeDef[] = (() => {
  const arr: OpcodeDef[] = new Array(16);
  for (const def of Object.values(OPCODES)) arr[def.opcode] = def;
  return arr;
})();

/** Nombres de registros. */
export const REGISTER_NAMES = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

/**
 * Convenciones de uso de registros (documentadas en el informe).
 *   R0 -> siempre 0x0000 (zero-register)
 *   R1 -> acumulador principal / valor de retorno
 *   R2 -> segundo operando / parámetro B
 *   R3..R7 -> propósito general (variables locales, contadores)
 */
export const REGISTER_ROLES: Record<number, string> = {
  0: 'Zero (cableado a 0)',
  1: 'Acumulador / retorno',
  2: 'Operando / parámetro B',
  3: 'Variable local',
  4: 'Variable local',
  5: 'Variable local',
  6: 'Variable local',
  7: 'Variable local',
};

/* ============== HELPERS ============== */

/** Convierte un inmediato de 6 bits a entero con signo. */
export function signExtend6(value: number): number {
  const SIX_BIT_MASK = 0x3F;
  const SIGN_BIT = 0x20;
  const v = value & SIX_BIT_MASK;
  return (v & SIGN_BIT) ? (v - 0x40) : v;
}

/** Codifica una instrucción de 16 bits a partir de opcode y partes. */
export function packInstruction(opcode: number, rest: number): number {
  return ((opcode & OPCODE_MASK) << 12) | (rest & 0x0FFF);
}

/** Convierte un número a string hexadecimal de 4 dígitos (16 bits). */
export function toHex16(value: number): string {
  return (value & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}