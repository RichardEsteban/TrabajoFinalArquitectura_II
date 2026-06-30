/**
 * assembler.ts
 * --------------------------------------------------------------------
 * Ensamblador de dos pasadas para la ISA UNI-16.
 *
 *  Pasada 1: tokenización + identificación de etiquetas + medición
 *            de tamaño de cada instrucción (para resolver saltos).
 *  Pasada 2: codificación efectiva -> vector de palabras de 16 bits.
 *
 *  Salida: AssemblyResult con `program`, `symbols`, `listing`,
 *          `errors` y `warnings`.
 * --------------------------------------------------------------------
 */

import {
  OPCODES,
  REGISTER_NAMES,
  signExtend6,
  packInstruction,
  MEMORY_WORDS,
  REGISTER_COUNT,
} from './isa';
import type {
  AssemblyError,
  AssemblyResult,
  AssemblyWarning,
  SourceListing,
} from './state';

/* ============== TOKENS ============== */

type TokenKind =
  | 'label'      //  ETIQUETA:
  | 'mnemonic'   // ADD, LOAD, ...
  | 'reg'        // R0..R7
  | 'imm'        // número o #-prefixed
  | 'ident'      // nombre de etiqueta sin ':'
  | 'comma'
  | 'newline';

interface Token {
  kind: TokenKind;
  text: string;
  value: number | null;     // para imm / reg
  line: number;
  col: number;
}

/* ============== LEXER ============== */

function lexLine(rawLine: string, lineNo: number, tokens: Token[]): void {
  // Quitar comentario que comienza con ';' hasta fin de línea.
  // El lexer opera sobre la versión SIN comentario para no confundir
  // el ';' con un carácter inválido.
  const semi = rawLine.indexOf(';');
  const line = (semi >= 0 ? rawLine.slice(0, semi) : rawLine).trim();

  if (line === '') return;     // línea vacía / comentario puro

  // n es la longitud de la línea YA PROCESADA (sin comentario).
  // Antes usaba rawLine.length y eso podía hacer que el while entrara
  // más allá del final real del string cuando había un comentario
  // largo (saliendo por suerte gracias al check `ch === undefined`,
  // pero igualmente frágil).
  const n = line.length;
  let i = 0;

  // Detectar etiqueta: TOK seguido de ':'
  // Estrategia: encontrar primer token, ver si termina en ':'
  const colonMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(line);
  if (colonMatch) {
    tokens.push({
      kind: 'label',
      text: colonMatch[1],
      value: null,
      line: lineNo,
      col: 1,
    });
    i = colonMatch[0].length;
    // seguir parseando lo que quede en la misma línea (instrucción)
  }

  // Tope defensivo de iteraciones para garantizar terminación.
  const MAX_TOKENS_PER_LINE = 64;
  let safety = 0;

  while (i < n) {
    if (++safety > MAX_TOKENS_PER_LINE) {
      throw { kind: 'lex', line: lineNo, col: i + 1,
              message: 'Demasiados tokens en una línea (posible input corrupto).' };
    }

    const ch = line[i];
    if (ch === undefined) break;

    if (/\s/.test(ch)) { i++; continue; }

    if (ch === ',') {
      tokens.push({ kind: 'comma', text: ',', value: null, line: lineNo, col: i + 1 });
      i++; continue;
    }

    // Inmediato (decimal, hex 0xNN, o con prefijo '#')
    if (ch === '#' || /[0-9-]/.test(ch)) {
      const m = /^#?-?(?:0x[0-9A-Fa-f]+|[0-9]+)/.exec(line.slice(i));
      if (m) {
        const txt = m[0];
        const num = parseInt(txt.replace('#', ''), txt.includes('0x') ? 16 : 10);
        tokens.push({ kind: 'imm', text: txt, value: num, line: lineNo, col: i + 1 });
        i += m[0].length;
        continue;
      }
    }

    // Identificador (registro, mnemónico, etiqueta)
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i));
    if (m) {
      const txt = m[0];
      // ¿Es registro?
      if (/^R[0-7]$/.test(txt)) {
        tokens.push({ kind: 'reg', text: txt, value: parseInt(txt[1]!), line: lineNo, col: i + 1 });
      } else if (OPCODES[txt.toUpperCase()]) {
        tokens.push({ kind: 'mnemonic', text: txt.toUpperCase(), value: null, line: lineNo, col: i + 1 });
      } else {
        tokens.push({ kind: 'ident', text: txt, value: null, line: lineNo, col: i + 1 });
      }
      i += m[0].length;
      continue;
    }

    // Carácter desconocido -> error léxico
    throw { kind: 'lex', line: lineNo, col: i + 1, message: `Carácter inesperado '${ch}'` };
  }
}

function tokenize(source: string): { tokens: Token[]; lines: string[] } {
  const rawLines = source.split(/\r?\n/);
  const tokens: Token[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    try {
      lexLine(rawLines[i]!, i + 1, tokens);
    } catch (e: any) {
      // re-emit con tipo
      throw e;
    }
  }
  return { tokens, lines: rawLines };
}

/* ============== AST INTERMEDIO ============== */

interface ParsedLine {
  lineNo: number;
  label?: string;
  mnemonic?: string;          // null => línea con sólo etiqueta
  operands: (Reg | Imm | Ident)[];
}

interface Reg    { kind: 'reg'; value: number; }
interface Imm    { kind: 'imm'; value: number; }
interface Ident  { kind: 'ident'; text: string; }

/* ============== PARSER (devuelve líneas y errores) ============== */

function parseTokens(tokens: Token[], lines: string[]):
  { parsed: ParsedLine[]; errors: AssemblyError[] } {

  const errors: AssemblyError[] = [];
  const parsed: ParsedLine[] = [];
  let i = 0;

  // Tope defensivo para garantizar terminación aún ante bugs futuros.
  const MAX_OUTER_ITERS = tokens.length * 2 + 4;
  let safety = 0;

  while (i < tokens.length) {
    if (++safety > MAX_OUTER_ITERS) {
      // Si llegamos aquí, hay un bug en el parser: reportamos y rompemos
      // para no entrar en loop infinito (causaba OOM en el navegador).
      errors.push({
        lineNo: tokens[i]!.line, col: tokens[i]!.col, kind: 'syntax',
        message: 'Parser: demasiadas iteraciones, posible input corrupto.',
      });
      break;
    }

    const startI = i;
    const lineNo = tokens[i]!.line;
    const pl: ParsedLine = { lineNo, operands: [] };

    // ¿Etiqueta al inicio?
    if (tokens[i]!.kind === 'label') {
      pl.label = tokens[i]!.text;
      i++;
    }

    // ¿Mnemónico?
    if (i < tokens.length && tokens[i]!.kind === 'mnemonic') {
      // *** FIX CRÍTICO ***
      // La etiqueta puede estar en una línea (e.g. "MAIN:") y el
      // mnemónico en la siguiente (e.g. "    LOAD R1, 5"). En ese
      // caso, los operandos están en la línea del MNEMÓNICO, no
      // en la línea de la etiqueta. Por eso comparamos contra
      // mnLine (linea del mnemonic), no contra lineNo (linea del
      // label). Sin este fix, el bucle interno nunca consume los
      // operandos y el iter externo se queda atascado, causando
      // un loop infinito -> OOM en el navegador.
      const mnLine = tokens[i]!.line;
      pl.mnemonic = tokens[i]!.text;
      i++;

      // Operandos separados por comas
      while (i < tokens.length && tokens[i]!.line === mnLine) {
        const t = tokens[i]!;
        if (t.kind === 'reg')        pl.operands.push({ kind: 'reg',   value: t.value! });
        else if (t.kind === 'imm')   pl.operands.push({ kind: 'imm',   value: t.value! });
        else if (t.kind === 'ident') pl.operands.push({ kind: 'ident', text: t.text });
        else if (t.kind === 'comma') { /* skip */ }
        else {
          errors.push({
            lineNo: t.line, col: t.col, kind: 'syntax',
            message: `Operando inválido '${t.text}'`,
          });
        }
        i++;
      }
    }

    parsed.push(pl);

    // Defensa secundaria: si por alguna razón este iter externo no
    // consumió ningún token (caso patológico), avanzar forzosamente
    // para evitar un loop infinito. Esto no debería ocurrir con la
    // corrección anterior, pero es una red de seguridad.
    if (i === startI) {
      i++;
    }
  }

  return { parsed, errors };
}

/* ============== ENSAMBLADO DE DOS PASADAS ============== */

export function assemble(source: string): AssemblyResult {
  const program  = new Uint16Array(MEMORY_WORDS);
  const symbols  = new Map<string, number>();
  const listing: SourceListing[] = [];
  const errors:  AssemblyError[]  = [];
  const warnings: AssemblyWarning[] = [];

  /* ----- 1. Lexer ----- */
  let tokens: Token[], rawLines: string[];
  try {
    ({ tokens, lines: rawLines } = tokenize(source));
  } catch (e: any) {
    return {
      program: new Uint16Array(0), symbols: new Map(), listing: [],
      errors: [e], warnings: [],
    };
  }

  /* ----- 2. Parser ----- */
  const { parsed, errors: parseErrors } = parseTokens(tokens, rawLines);
  errors.push(...parseErrors);

  /* ----- 3. Pasada 1: construir tabla de símbolos ----- */
  // Una instrucción siempre ocupa 1 palabra (arquitectura RISC uniforme).
  let address = 0;
  const addrOfLine = new Map<number, number>();   // lineNo -> dirección

  for (const pl of parsed) {
    if (pl.label) {
      if (symbols.has(pl.label)) {
        errors.push({
          lineNo: pl.lineNo, col: 1, kind: 'duplicate-label',
          message: `Etiqueta duplicada '${pl.label}'`,
        });
      } else {
        symbols.set(pl.label, address);
      }
    }
    if (pl.mnemonic) {
      addrOfLine.set(pl.lineNo, address);
      address += 1;
      if (address > MEMORY_WORDS) {
        errors.push({
          lineNo: pl.lineNo, col: 1, kind: 'program-overflow',
          message: `El programa excede ${MEMORY_WORDS} palabras`,
        });
        break;
      }
    }
  }

  /* ----- 4. Pasada 2: codificación ----- */
  address = 0;
  for (const pl of parsed) {
    const src = rawLines[pl.lineNo - 1] ?? '';
    if (!pl.mnemonic) {
      // línea con sólo etiqueta (o vacía) -> no produce código
      listing.push({
        lineNo: pl.lineNo, address: null, raw: null,
        source: src, label: pl.label,
      });
      continue;
    }

    const def = OPCODES[pl.mnemonic];
    if (!def) {
      // No debería ocurrir (ya filtrado en el parser), pero por defensa:
      errors.push({
        lineNo: pl.lineNo, col: 1, kind: 'unknown-mnemonic',
        message: `Mnemónico desconocido '${pl.mnemonic}'`,
      });
      continue;
    }

    const ops = pl.operands;
    let raw: number | null = null;
    let operandStr = '';

    switch (def.shape) {
      case 'none': {
        if (ops.length !== 0) {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} no admite operandos`,
          });
        }
        raw = packInstruction(def.opcode, 0);
        operandStr = '';
        break;
      }

      case 'reg': {
        if (ops.length !== 1 || ops[0]!.kind !== 'reg') {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera un registro (ej. R3)`,
          });
          break;
        }
        const rd = ops[0] as Reg;
        raw = packInstruction(def.opcode, rd.value << 9);
        operandStr = `R${rd.value}`;
        break;
      }

      case 'reg-reg': {
        if (ops.length !== 2 ||
            ops[0]!.kind !== 'reg' || ops[1]!.kind !== 'reg') {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera dos registros (ej. R1, R2)`,
          });
          break;
        }
        const rd = ops[0] as Reg, rs = ops[1] as Reg;
        raw = packInstruction(def.opcode, (rd.value << 9) | (rs.value << 6));
        operandStr = `R${rd.value}, R${rs.value}`;
        break;
      }

      case 'reg-imm': {
        if (ops.length !== 2 ||
            ops[0]!.kind !== 'reg' || ops[1]!.kind !== 'imm') {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera registro e inmediato (ej. R1, 5)`,
          });
          break;
        }
        const rd = ops[0] as Reg;
        const imm = ops[1] as Imm;
        if (imm.value < -32 || imm.value > 31) {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'imm-out-of-range',
            message: `Inmediato ${imm.value} fuera de rango [-32, 31]`,
          });
          break;
        }
        const imm6 = imm.value & 0x3F;
        raw = packInstruction(def.opcode, (rd.value << 9) | imm6);
        operandStr = `R${rd.value}, ${imm.value}`;
        break;
      }

      case 'mem-reg': {
        // Sintaxis: LW Rd, Rs  o  SW Rd, Rs
        if (ops.length !== 2 ||
            ops[0]!.kind !== 'reg' || ops[1]!.kind !== 'reg') {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera Rd, Rs (ej. R1, R2)`,
          });
          break;
        }
        const rd = ops[0] as Reg, rs = ops[1] as Reg;
        raw = packInstruction(def.opcode, (rd.value << 9) | (rs.value << 6));
        operandStr = `R${rd.value}, [R${rs.value}]`;
        break;
      }

      case 'addr': {
        // dirección de salto: o un inmediato (absoluto) o un identificador
        if (ops.length !== 1) {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera una dirección`,
          });
          break;
        }
        let addr = -1;
        const op = ops[0]!;
        if (op.kind === 'imm') {
          addr = op.value;
        } else if (op.kind === 'ident') {
          if (!symbols.has(op.text)) {
            errors.push({
              lineNo: pl.lineNo, col: 1, kind: 'unknown-label',
              message: `Etiqueta '${op.text}' no definida`,
            });
            break;
          }
          addr = symbols.get(op.text)!;
        } else {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `${pl.mnemonic} espera una etiqueta o dirección numérica`,
          });
          break;
        }
        if (addr < 0 || addr >= MEMORY_WORDS) {
          errors.push({
            lineNo: pl.lineNo, col: 1, kind: 'bad-operand',
            message: `Dirección ${addr} fuera de rango [0, ${MEMORY_WORDS - 1}]`,
          });
          break;
        }
        raw = packInstruction(def.opcode, addr & 0x0FFF);
        operandStr = `0x${addr.toString(16).toUpperCase()}`;
        break;
      }

      default:
        errors.push({
          lineNo: pl.lineNo, col: 1, kind: 'syntax',
          message: `Forma de operando no soportada para ${pl.mnemonic}`,
        });
    }

    listing.push({
      lineNo: pl.lineNo, address, raw, source: src,
      label: pl.label, mnemonic: pl.mnemonic, operandStr,
    });

    if (raw !== null) {
      program[address] = raw;
      address += 1;
    }
  }

  // Warnings: etiquetas definidas pero no usadas (no implementado en este informe,
  // pero dejamos el hook para no perder el contrato del tipo AssemblyResult).
  // (Si se desea, basta con recorrer symbols y cruzar contra operandos `ident`.)

  return {
    program: errors.length > 0 ? new Uint16Array(0) : program.subarray(0, address),
    symbols,
    listing,
    errors,
    warnings,
  };
}

/* ============== EXPORTACIÓN A .HEX (formato plano) ============== */

export function programToHex(program: Uint16Array): string {
  const lines: string[] = [];
  for (let i = 0; i < program.length; i++) {
    lines.push(program[i]!.toString(16).toUpperCase().padStart(4, '0'));
  }
  return lines.join('\n');
}

/* ============== HELPERS PARA DEBUG ============== */

export const __internal = {
  lexLine,
  tokenize,
  parseTokens,
  signExtend6,
  REGISTER_NAMES,
  REGISTER_COUNT,
};