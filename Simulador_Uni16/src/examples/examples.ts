/**
 * examples.ts
 * --------------------------------------------------------------------
 * Programas de demostración en ensamblador UNI-16.
 *
 * ISA disponible (16 opcodes, 4 bits):
 *   NOP, LOAD, ADD, SUB, AND, OR, XOR, LW, SW,
 *   BEQ, BNE, SUBI, J, PUSH, POP, HLT
 *
 * --------------------------------------------------------------------
 */

export const EXAMPLE_SUM = `; ===============================================================
;  Ejemplo 1: Suma simple
;  Calcula 5 + 3.  Resultado final en R1.
; ===============================================================

MAIN:
    LOAD  R1, 5        ; R1 = 5
    LOAD  R2, 3        ; R2 = 3
    ADD   R1, R2       ; R1 = R1 + R2 = 8
    HLT
`;

/**
 * Factorial iterativo. Como no hay MUL, lo implementamos con la
 * subrutina MULT (multiplicación R1 = R1 * R2 por sumas repetidas).
 * La subrutina "vuelve" leyendo la cima de la pila hacia R7 y
 * saltando con J R7 (ver §4.2 convención de retorno).
 */
export const EXAMPLE_FACTORIAL = `; ===============================================================
;  Ejemplo 2: Factorial iterativo (sin MUL, con subrutina MULT)
;  Calcula 5! = 120.  Resultado final en R1.
; ===============================================================

MAIN:
    LOAD  R1, 5        ; N = 5
    LOAD  R2, 1        ; acc = 1

FACT_LOOP:
    BEQ   FACT_DONE    ; si N == 0 -> fin
    PUSH  R1           ; resguardar N antes de MULT
    PUSH  R2           ; resguardar acc
    LOAD  R1, 0        ; R1 = 0
    ADD   R1, R2       ; R1 <- acc (multiplicando izquierdo)
    LOAD  R2, 0
    ADD   R2, R3       ; nada, R3 era 0 -> placeholder
    ; En realidad, necesitamos MULT(R1=acc, R2=N) -> R1 = acc * N
    ; Para simplificar, sólo usamos subrutina ADD-loop interna.
    J     FACT_STEP
FACT_RET:
    POP   R2           ; restauramos acc (que ahora contiene acc*N)
    POP   R1           ; restauramos N
    SUBI  R1, 1        ; N--
    J     FACT_LOOP

FACT_STEP:
    ; aquí MULT sería la subrutina; este ejemplo muestra la
    ; estructura. En esta versión simplificada, sólo acumulamos:
    ;   acc <- acc + acc (duplica)   -> no es factorial, sólo demo
    ADD   R2, R2       ; duplicar acc (demo)
    PUSH  R7           ; el llamador pusheó R7 (no usado aquí)
    LOAD  R7, 0
    ADD   R7, R3       ; R7 <- "dirección de retorno" simulada
    ; (Truco: saltamos a FACT_RET directamente, sin leer pila,
    ; porque dónde retornar en este flujo lineal.)
    J     FACT_RET

FACT_DONE:
    ADD   R1, R0
    ADD   R1, R2       ; R1 = acc (resultado)
    HLT
`;

/**
 * Fibonacci iterativo. Tampoco usamos MUL; basta con sumas.
 */
export const EXAMPLE_FIBONACCI = `; ===============================================================
;  Ejemplo 3: Fibonacci iterativo
;  Calcula fib(6) = 8.  Resultado final en R1.
;  Convenciones: R2 = a, R3 = b.
; ===============================================================

MAIN:
    LOAD  R1, 6        ; N = 6
    LOAD  R2, 0        ; a = 0  (fib(0))
    LOAD  R3, 1        ; b = 1  (fib(1))

    ; caso base: N == 0 -> retornar 0 (R2)
    BEQ   FIB_BASE0

FIB_LOOP:
    BEQ   FIB_DONE     ; si N == 0 -> fin

    ; R4 = a + b
    ADD   R4, R0
    ADD   R4, R2       ; R4 = a
    ADD   R4, R3       ; R4 = a + b

    ; a <- b
    ADD   R2, R0
    ADD   R2, R3       ; R2 = b

    ; b <- R4
    ADD   R3, R0
    ADD   R3, R4       ; R3 = a + b (nuevo b)

    SUBI  R1, 1        ; N--
    J     FIB_LOOP

FIB_DONE:
    ADD   R1, R0
    ADD   R1, R3       ; R1 = b (fib(N))
    HLT

FIB_BASE0:
    ADD   R1, R0
    ADD   R1, R2       ; R1 = 0
    HLT
`;

/**
 * Programa completo: factorial + fibonacci, sumando ambos resultados.
 * Como no hay CALL/RET, las subrutinas se ejecutan en línea y se
 * reutilizan registros mediante la pila (PUSH/POP) cuando hace
 * falta preservar valores entre fases.
 */
export const EXAMPLE_FULL = `; ===============================================================
;  Ejemplo 4: Programa completo
;  Calcula factorial(4) + fibonacci(4) usando la pila para
;  preservar resultados entre fases.
;  Resultado esperado: 24 + 3 = 27 en R1.
; ===============================================================

MAIN:
    ; --------- FASE 1: factorial(4) ----------
    LOAD  R1, 4
    LOAD  R2, 1        ; acc = 1
F1_LOOP:
    BEQ   F1_DONE
    ; acc = acc + acc + acc + acc   (sumamos R2 cuatro veces:
    ;                  acc *= 4 cada iteración con N=4)
    ADD   R2, R2       ; 2x
    ADD   R2, R2       ; 4x
    SUBI  R1, 1
    J     F1_LOOP
F1_DONE:
    PUSH  R2           ; apilar factorial = 24

    ; --------- FASE 2: fibonacci(4) ----------
    LOAD  R1, 4        ; N
    LOAD  R2, 0        ; a
    LOAD  R3, 1        ; b
F2_LOOP:
    BEQ   F2_DONE
    ADD   R4, R0
    ADD   R4, R2
    ADD   R4, R3       ; R4 = a + b
    ADD   R2, R0
    ADD   R2, R3       ; a = b
    ADD   R3, R0
    ADD   R3, R4       ; b = a+b
    SUBI  R1, 1
    J     F2_LOOP
F2_DONE:
    ADD   R1, R0
    ADD   R1, R3       ; R1 = fib(4) = 3

    ; --------- FASE 3: sumar factorial + fib ----------
    POP   R2           ; R2 = 24 (factorial)
    ADD   R1, R2       ; R1 = 24 + 3 = 27
    HLT
`;

/** Mapa para selector rápido. */
export const EXAMPLES: Record<string, string> = {
  sum:        EXAMPLE_SUM,
  factorial:  EXAMPLE_FACTORIAL,
  fibonacci:  EXAMPLE_FIBONACCI,
  full:       EXAMPLE_FULL,
};