/**
 * examples.ts
 * --------------------------------------------------------------------
 * Programas de demostracion en ensamblador UNI-16.
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
;  Reemplaza el valor de R5 y R6 con los de tu eleccion.
; ===============================================================

MAIN:
    LOAD  R5, 0        ; a = <-- reemplaza 0 por el valor de a
    LOAD  R6, 0        ; b = <-- reemplaza 0 por el valor de b
    ADD   R1, R0
    ADD   R1, R5
    ADD   R1, R6       ; R1 = a + b
    HLT
`;

export const EXAMPLE_FACTORIAL = `; ===============================================================
;  Ejemplo 2: Factorial iterativo
;  Calcula N! .  R5 = N.  Resultado en R1.
;  Reemplaza el valor de R5 con el de tu eleccion.
;
;  Tabla de referencia:
;    0! = 1   1! = 1   2! = 2   3! = 6   4! = 24  5! = 120
;
; ===============================================================

MAIN:
    LOAD  R5, 0        ; N = <-- reemplaza 0 por el valor de N
    LOAD  R2, 1         ; R2 = 1 (resultado acumulado; 0! = 1! = 1)
    ADD   R1, R0
    ADD   R1, R5        ; R1 = N  (Z = 1 sii N == 0)
    BEQ   FACT_DONE     ; si N == 0 -> 0! = 1 (R2 = 1)

FACT_LOOP:
    BEQ   FACT_DONE     ; si R1 == 1 -> listo, R2 = 1
    SUB   R3, R3         ; R3 = 0  (en lugar de 'ADD R3, R0', que no limpia)
    ADD   R3, R1         ; R3 = N (contador para multiplicacion)
    SUB   R4, R4         ; R4 = 0  (acumulador de la suma)

MULT_LOOP:               ; do { acumulador += R2; R3-- } while (R3 != 0)
    ADD   R4, R2         ; acumulador += resultado
    SUBI  R3, 1          ; contador--
    BEQ   MULT_DONE      ; si contador == 0 -> fin
    J     MULT_LOOP

MULT_DONE:
    SUB   R2, R2         ; R2 = 0  (en lugar de 'ADD R2, R0')
    ADD   R2, R4         ; resultado = acumulador
    SUBI  R1, 1          ; N--
    J     FACT_LOOP

FACT_DONE:
    ADD   R1, R0
    ADD   R1, R2         ; R1 = resultado final
    HLT
`;

export const EXAMPLE_FIBONACCI = `; ===============================================================
;  Ejemplo 3: Fibonacci iterativo
;  Calcula fib(N) .  R5 = N.  Resultado en R1.
;  Reemplaza el valor de R5 con el de tu eleccion.
;
;  Tabla de referencia:
;    fib(0)=0  fib(1)=1  fib(2)=1  fib(3)=2  fib(4)=3  fib(5)=5
;                              fib(6)=8  fib(7)=13 fib(8)=21
; ===============================================================

MAIN:
    LOAD  R5, 0        ; N = <-- reemplaza 0 por el valor de N
    LOAD  R2, 0         ; R2 = 0 (fib(0); lo pre-inicializamos para
                        ; que el caso base N==0 no necesite LOAD extra)
    ADD   R1, R0
    ADD   R1, R5        ; R1 = N  (Z = 1 sii N == 0)
    BEQ   FIB_BASE0     ; si N == 0 -> fib(0) = 0 (R2 ya esta)
    LOAD  R3, 1         ; R3 = 1 (fib(1))

FIB_LOOP:               ; invariante: (R2,R3) = (fib(k), fib(k+1))
    SUB   R4, R4         ; R4 = 0  (en lugar de 'ADD R4, R0', que no limpia)
    ADD   R4, R2         ; R4 = R2
    ADD   R4, R3         ; R4 = R2 + R3  (suma)

    SUB   R2, R2         ; R2 = 0  (en lugar de 'ADD R2, R0')
    ADD   R2, R3         ; R2 = R3       (nuevo a)
    SUB   R3, R3         ; R3 = 0  (en lugar de 'ADD R3, R0')
    ADD   R3, R4         ; R3 = R4 = a+b (nuevo b)

    SUBI  R1, 1          ; N-- y Z = 1 si N era 1
    BEQ   FIB_DONE       ; si R1 == 0 -> listo, R2 = fib(N)
    J     FIB_LOOP

FIB_DONE:
    ADD   R1, R0
    ADD   R1, R2         ; R1 = resultado correcto
    HLT

FIB_BASE0:
    ADD   R1, R0
    ADD   R1, R2         ; R1 = 0
    HLT
`;

export const EXAMPLE_FULL = `; ===============================================================
;  Ejemplo 4: Programa completo
;  Calcula factorial(a) + fib(b).
;  R5 = a, R6 = b.  Resultado en R1.
;  Reemplaza los valores de R5 y R6 con los de tu eleccion.
;
;  Ejemplo: a=5, b=3 -> 5! + fib(3) = 120 + 2 = 122
;  Ejemplo: a=0, b=4 -> 0! + fib(4) = 1 + 3  = 4
; ===============================================================

MAIN:
    LOAD  R5, 0        ; a = <-- reemplaza 0 por el valor de a
    LOAD  R6, 0        ; b = <-- reemplaza 0 por el valor de b

    ; -------- FACTORIAL(a) --------
    LOAD  R2, 1         ; R2 = 1 (resultado acumulado; 0! = 1! = 1)
    ADD   R1, R0
    ADD   R1, R5        ; R1 = a  (Z = 1 sii a == 0)
    BEQ   FACT_DONE     ; si a == 0 -> 0! = 1 (R2 = 1)

FACT_LOOP:
    BEQ   FACT_DONE     ; si R1 == 1 -> listo, R2 = 1
    SUB   R3, R3         ; R3 = 0
    ADD   R3, R1         ; R3 = N (contador para multiplicacion)
    SUB   R4, R4         ; R4 = 0

MULT_LOOP:
    ADD   R4, R2         ; acumulador += resultado
    SUBI  R3, 1          ; contador--
    BEQ   MULT_DONE
    J     MULT_LOOP

MULT_DONE:
    SUB   R2, R2         ; R2 = 0
    ADD   R2, R4         ; R2 = acumulador (nuevo parcial)
    SUBI  R1, 1          ; N--
    J     FACT_LOOP

FACT_DONE:
    PUSH  R2             ; guardar factorial(a) en la pila

    ; -------- FIBONACCI(b) --------
    LOAD  R2, 0          ; pre-cargar R2 = 0 (fib(0)) para que el
                         ; caso base N==0 no necesite LOAD extra
    ADD   R1, R0
    ADD   R1, R6         ; R1 = b  (Z = 1 sii b == 0)
    BEQ   FIB_BASE0      ; si b == 0 -> fib(0) = 0 (R2 ya esta)
    LOAD  R3, 1          ; R3 = 1 (fib(1))

FIB_LOOP:                ; invariante: (R2,R3) = (fib(k), fib(k+1))
    SUB   R4, R4         ; R4 = 0
    ADD   R4, R2         ; R4 = R2
    ADD   R4, R3         ; R4 = R2 + R3
    SUB   R2, R2         ; R2 = 0
    ADD   R2, R3         ; R2 = R3 (nuevo a)
    SUB   R3, R3         ; R3 = 0
    ADD   R3, R4         ; R3 = R4 = a+b (nuevo b)
    SUBI  R1, 1
    BEQ   FIB_DONE
    J     FIB_LOOP

FIB_DONE:
    ADD   R1, R0
    ADD   R1, R2         ; R1 = fib(b)
    POP   R2             ; recuperar factorial(a)
    ADD   R1, R2         ; R1 = factorial(a) + fib(b)
    HLT

FIB_BASE0:
    ADD   R1, R0
    ADD   R1, R2         ; R1 = 0
    POP   R2
    ADD   R1, R2         ; R1 = factorial(a) + 0
    HLT
`;

/** Mapa para selector rapido. */
export const EXAMPLES: Record<string, string> = {
  sum:        EXAMPLE_SUM,
  factorial:  EXAMPLE_FACTORIAL,
  fibonacci:  EXAMPLE_FIBONACCI,
  full:       EXAMPLE_FULL,
};
