/**
 * examples.ts
 * --------------------------------------------------------------------
 * Programas de demostración en ensamblador UNI-16.
 *
 * ISA disponible (16 opcodes, 4 bits):
 *   NOP, LOAD, ADD, SUB, AND, OR, XOR, LW, SW,
 *   BEQ, BNE, SUBI, J, PUSH, POP, HLT
 *
 * En cada ejemplo el usuario puede modificar libremente los valores
 * de 'a' y 'b' (LOAD R5 y LOAD R6) segun necesite para sus ejercicios.
 * --------------------------------------------------------------------
 */

export const EXAMPLE_SUM = `; ===============================================================
;  Ejemplo 1: Suma simple
;  Calcula a + b.  R5 = a, R6 = b.  Resultado en R1.
;  Modifica los valores de R5 y R6 a tu gusto.
; ===============================================================

MAIN:
    LOAD  R5, 5        ; a = 5  <-- cambia este valor
    LOAD  R6, 3        ; b = 3  <-- cambia este valor
    ADD   R1, R0
    ADD   R1, R5
    ADD   R1, R6       ; R1 = a + b
    HLT
`;

export const EXAMPLE_FACTORIAL = `; ===============================================================
;  Ejemplo 2: Factorial iterativo
;  Calcula a! .  R5 = a.  Resultado en R1.
;  Modifica el valor de R5 a tu gusto.
; ===============================================================

MAIN:
    LOAD  R5, 4        ; a = 4  <-- cambia este valor
    ADD   R1, R0
    ADD   R1, R5        ; R1 = N
    LOAD  R2, 1         ; resultado

FACT_LOOP:
    BEQ   FACT_DONE    ; si N == 0 -> fin
    LOAD  R3, 0
    ADD   R4, R0
    ADD   R4, R1        ; R4 = contador

MULT_LOOP:
    BEQ   MULT_DONE    ; si contador == 0 -> fin mult
    ADD   R3, R2        ; acumulador += resultado
    SUBI  R4, 1         ; contador--
    J     MULT_LOOP

MULT_DONE:
    ADD   R2, R0
    ADD   R2, R3        ; resultado = acumulador
    SUBI  R1, 1         ; N--
    J     FACT_LOOP

FACT_DONE:
    ADD   R1, R0
    ADD   R1, R2        ; R1 = resultado final
    HLT
`;

export const EXAMPLE_FIBONACCI = `; ===============================================================
;  Ejemplo 3: Fibonacci iterativo
;  Calcula fib(a) .  R5 = a.  Resultado en R1.
;  Modifica el valor de R5 a tu gusto.
; ===============================================================

MAIN:
    LOAD  R5, 6        ; a = 6  <-- cambia este valor
    ADD   R1, R0
    ADD   R1, R5        ; R1 = N
    LOAD  R2, 0         ; a = 0  (fib(0))
    LOAD  R3, 1         ; b = 1  (fib(1))
    BEQ   FIB_BASE0     ; si N == 0 -> fib(0) = 0

FIB_LOOP:
    BEQ   FIB_DONE      ; si N == 0 -> fin

    ADD   R4, R0
    ADD   R4, R2
    ADD   R4, R3        ; R4 = a + b

    ADD   R2, R0
    ADD   R2, R3        ; a = b

    ADD   R3, R0
    ADD   R3, R4        ; b = R4 (nuevo b)

    SUBI  R1, 1         ; N--
    J     FIB_LOOP

FIB_DONE:
    ADD   R1, R0
    ADD   R1, R2        ; R1 = resultado correcto
    HLT

FIB_BASE0:
    ADD   R1, R0
    ADD   R1, R2        ; R1 = 0
    HLT
`;

export const EXAMPLE_FULL = `; ===============================================================
;  Ejemplo 4: Programa completo
;  Calcula factorial(a) + fib(b).
;  R5 = a, R6 = b.  Resultado en R1.
;  Modifica los valores de R5 y R6 a tu gusto.
;
;  Resultado esperado: factorial(a) + fib(b)
; ===============================================================

MAIN:
    LOAD  R5, 4        ; a = 4  <-- cambia este valor
    LOAD  R6, 4        ; b = 4  <-- cambia este valor

    ; -------- FACTORIAL --------
    ADD   R1, R0
    ADD   R1, R5        ; N = a
    LOAD  R2, 1         ; resultado

FACT_LOOP:
    BEQ   FACT_DONE
    LOAD  R3, 0
    ADD   R4, R0
    ADD   R4, R1        ; R4 = contador

MULT_LOOP:
    BEQ   MULT_DONE
    ADD   R3, R2
    SUBI  R4, 1
    J     MULT_LOOP

MULT_DONE:
    ADD   R2, R0
    ADD   R2, R3
    SUBI  R1, 1
    J     FACT_LOOP

FACT_DONE:
    PUSH  R2            ; guardar factorial(a)

    ; -------- FIBONACCI --------
    ADD   R1, R0
    ADD   R1, R6        ; N = b
    LOAD  R2, 0         ; a = 0
    LOAD  R3, 1         ; b = 1
    BEQ   FIB_BASE0

FIB_LOOP:
    BEQ   FIB_DONE
    ADD   R4, R0
    ADD   R4, R2
    ADD   R4, R3        ; R4 = a + b

    ADD   R2, R0
    ADD   R2, R3        ; a = b

    ADD   R3, R0
    ADD   R3, R4        ; b = R4

    SUBI  R1, 1
    J     FIB_LOOP

FIB_DONE:
    ADD   R1, R0
    ADD   R1, R2        ; R1 = fib(b)
    POP   R2            ; recuperar factorial(a)
    ADD   R1, R2        ; suma final: factorial(a) + fib(b)
    HLT

FIB_BASE0:
    ADD   R1, R0
    ADD   R1, R2        ; R1 = 0
    POP   R2
    ADD   R1, R2        ; suma final
    HLT
`;

/** Mapa para selector rapido. */
export const EXAMPLES: Record<string, string> = {
  sum:        EXAMPLE_SUM,
  factorial:  EXAMPLE_FACTORIAL,
  fibonacci:  EXAMPLE_FIBONACCI,
  full:       EXAMPLE_FULL,
};
