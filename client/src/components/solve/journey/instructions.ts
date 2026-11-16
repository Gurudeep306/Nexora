/*
 * Plain-English notes for the instructions a compiler makes, so a student
 * can read a listing line by line. One short sentence each, true for the
 * common case. Unknown instructions simply get no note.
 */

export type ListingKind = 'machine' | 'jit' | 'bytecode' | 'interpreted'

export interface ParsedInstr {
  /** The instruction's name as written (mov, iload_0, LOAD_FAST…). */
  op: string
  /** Everything after it. */
  operands: string
  /** A comment the compiler added (Java's "// Method …", Python's "(n)"). */
  comment: string
}

/* ── x86-64 (Intel syntax) ── */
const X86: Record<string, string> = {
  mov: 'Copy a value into a register or memory.',
  movabs: 'Copy a large (64-bit) number into a register.',
  movzx: 'Copy a small value and fill the rest with zeros.',
  movsx: 'Copy a small value and keep its sign (for negative numbers).',
  movsxd: 'Widen a 32-bit number to 64 bits, keeping its sign.',
  lea: 'Work out an address (or a quick a + b·c sum) without touching memory.',
  add: 'Add the second value to the first.',
  sub: 'Subtract the second value from the first.',
  imul: 'Multiply two signed numbers.',
  mul: 'Multiply two unsigned numbers.',
  idiv: 'Divide signed numbers: the quotient goes to rax, the remainder to rdx.',
  div: 'Divide unsigned numbers: the quotient goes to rax, the remainder to rdx.',
  inc: 'Add 1.',
  dec: 'Subtract 1.',
  neg: 'Flip the sign (x becomes −x).',
  cmp: 'Compare two values (subtract them, keep only the result flags).',
  test: 'Check bits of two values (often: is this zero?).',
  jmp: 'Jump to another place in the code.',
  je: 'Jump if the last comparison was equal.',
  jz: 'Jump if the last result was zero.',
  jne: 'Jump if the last comparison was not equal.',
  jnz: 'Jump if the last result was not zero.',
  jl: 'Jump if less (signed).',
  jle: 'Jump if less or equal (signed).',
  jg: 'Jump if greater (signed).',
  jge: 'Jump if greater or equal (signed).',
  jb: 'Jump if below (unsigned).',
  jbe: 'Jump if below or equal (unsigned).',
  ja: 'Jump if above (unsigned).',
  jae: 'Jump if above or equal (unsigned).',
  js: 'Jump if the result was negative.',
  jns: 'Jump if the result was not negative.',
  jo: 'Jump if the last sum overflowed (Rust checks this in debug builds).',
  call: 'Call a function: remember where to come back, then jump to it.',
  ret: 'Return from the function to whoever called it.',
  push: 'Put a value on the stack.',
  pop: 'Take the top value off the stack.',
  leave: 'Tidy up this function’s stack space before returning.',
  xor: 'Bitwise XOR. “xor eax, eax” is the fastest way to set eax to 0.',
  and: 'Bitwise AND.',
  or: 'Bitwise OR.',
  not: 'Flip every bit.',
  shl: 'Shift bits left (multiply by a power of 2).',
  sal: 'Shift bits left (multiply by a power of 2).',
  shr: 'Shift bits right, unsigned (divide by a power of 2).',
  sar: 'Shift bits right, keeping the sign (divide by a power of 2).',
  cdq: 'Prepare edx for a 32-bit signed division.',
  cqo: 'Prepare rdx for a 64-bit signed division.',
  cdqe: 'Widen eax to rax, keeping the sign.',
  nop: 'Do nothing (padding so code lines up in memory).',
  endbr64: 'A safety marker: a valid place for an indirect jump to land.',
  ud2: 'Crash on purpose — this code should never be reached.',
  syscall: 'Ask the operating system to do something (read, write, exit…).',
  xchg: 'Swap two values.',
  movss: 'Copy a float.',
  movsd: 'Copy a double.',
  movaps: 'Copy 16 bytes of floating-point data.',
  movdqa: 'Copy 16 bytes at once.',
  movups: 'Copy 16 bytes at once.',
  addsd: 'Add two doubles.',
  subsd: 'Subtract two doubles.',
  mulsd: 'Multiply two doubles.',
  divsd: 'Divide two doubles.',
  cvtsi2sd: 'Turn an integer into a double.',
  cvttsd2si: 'Turn a double into an integer (cutting off the fraction).',
  pxor: 'Bitwise XOR on 16 bytes (often: set a float register to 0).',
  seto: 'Set a byte to 1 if the last sum overflowed.',
}

const JCC = /^j[a-z]{1,3}$/
const CMOV = /^cmov[a-z]{1,3}$/
const SETCC = /^set[a-z]{1,3}$/

/** Go's assembler names: MOVQ, ADDQ… → mov, add. */
const GO_SIZE = /^(MOV|ADD|SUB|IMUL|LEA|CMP|TEST|XOR|AND|OR|SHL|SHR|SAR|INC|DEC|NEG|PUSH|POP)[BWLQ]$/

function x86Note(op: string): string | null {
  const o = op.toLowerCase()
  const go = GO_SIZE.exec(op)
  if (go) return X86[go[1].toLowerCase()] ?? null
  if (op === 'CALL') return X86.call
  if (op === 'RET') return X86.ret
  if (op === 'JMP') return X86.jmp
  if (op === 'TEXT') return 'Go: the start of a function.'
  if (X86[o]) return X86[o]
  if (CMOV.test(o)) return 'Copy a value only if a condition holds — a branch with no jump.'
  if (SETCC.test(o)) return 'Set a byte to 1 or 0 from the last comparison.'
  if (JCC.test(o)) return 'Jump only if a condition from the last comparison holds.'
  return null
}

/* ── Java bytecode (JVM) ── */
const JVM: Record<string, string> = {
  iload: 'Push an int local variable onto the stack.',
  lload: 'Push a long local variable onto the stack.',
  dload: 'Push a double local variable onto the stack.',
  aload: 'Push an object reference (a local variable) onto the stack.',
  istore: 'Pop an int off the stack into a local variable.',
  lstore: 'Pop a long off the stack into a local variable.',
  dstore: 'Pop a double off the stack into a local variable.',
  astore: 'Pop an object reference into a local variable.',
  iconst: 'Push a small int constant.',
  lconst: 'Push a small long constant.',
  bipush: 'Push a small number (−128…127).',
  sipush: 'Push a number (−32768…32767).',
  ldc: 'Push a constant (a number or a string) from the class’s constant table.',
  ldc2_w: 'Push a long or double constant.',
  iadd: 'Pop two ints, push their sum.',
  ladd: 'Pop two longs, push their sum.',
  isub: 'Pop two ints, push their difference.',
  lsub: 'Pop two longs, push their difference.',
  imul: 'Pop two ints, push their product.',
  lmul: 'Pop two longs, push their product.',
  idiv: 'Pop two ints, push the quotient.',
  ldiv: 'Pop two longs, push the quotient.',
  irem: 'Pop two ints, push the remainder (%).',
  lrem: 'Pop two longs, push the remainder (%).',
  ineg: 'Flip the sign of the int on top.',
  iinc: 'Add a constant to an int local variable (i++).',
  i2l: 'Widen the int on top to a long.',
  l2i: 'Cut the long on top down to an int.',
  i2d: 'Turn the int on top into a double.',
  goto: 'Jump to another instruction.',
  ifeq: 'Jump if the int on top is 0.',
  ifne: 'Jump if the int on top is not 0.',
  iflt: 'Jump if the int on top is below 0.',
  ifge: 'Jump if the int on top is 0 or more.',
  ifgt: 'Jump if the int on top is above 0.',
  ifle: 'Jump if the int on top is 0 or less.',
  ifnull: 'Jump if the reference on top is null.',
  ifnonnull: 'Jump if the reference on top is not null.',
  lcmp: 'Compare two longs: push −1, 0 or 1.',
  invokevirtual: 'Call a method on an object.',
  invokestatic: 'Call a static method (no object needed).',
  invokespecial: 'Call a constructor or a private/parent method.',
  invokeinterface: 'Call a method through an interface.',
  invokedynamic: 'Call through a link made at run time (lambdas, string joins).',
  getstatic: 'Push a static field (e.g. System.out).',
  putstatic: 'Store into a static field.',
  getfield: 'Push a field of an object.',
  putfield: 'Store into a field of an object.',
  new: 'Make a new object (not yet set up).',
  dup: 'Copy the value on top of the stack.',
  pop: 'Throw away the value on top of the stack.',
  newarray: 'Make a new array of numbers.',
  anewarray: 'Make a new array of objects.',
  arraylength: 'Push the length of an array.',
  iaload: 'Push an int from an array.',
  iastore: 'Store an int into an array.',
  laload: 'Push a long from an array.',
  lastore: 'Store a long into an array.',
  aaload: 'Push an object from an array.',
  aastore: 'Store an object into an array.',
  ireturn: 'Return the int on top of the stack.',
  lreturn: 'Return the long on top of the stack.',
  areturn: 'Return the object on top of the stack.',
  return: 'Return from a void method.',
  checkcast: 'Check that the object is of the right type.',
  athrow: 'Throw the exception on top of the stack.',
  instanceof: 'Push 1 if the object is of a type, else 0.',
}

function jvmNote(op: string): string | null {
  if (JVM[op]) return JVM[op]
  const base = op.replace(/_(m1|\d)$/, '')
  if (JVM[base]) return JVM[base]
  if (/^if_icmp/.test(op)) return 'Pop two ints and jump if the comparison holds.'
  if (/^if_acmp/.test(op)) return 'Pop two references and jump if they are (not) the same object.'
  return null
}

/* ── Python bytecode ── */
const PY: Record<string, string> = {
  RESUME: 'A marker at the start of code: nothing to do here.',
  NOP: 'Do nothing.',
  CACHE: 'Space the interpreter uses to speed up the instruction before.',
  LOAD_CONST: 'Push a constant (a number, a string, a function’s code).',
  LOAD_SMALL_INT: 'Push a small integer.',
  LOAD_NAME: 'Push the value of a name (a variable or built-in).',
  LOAD_FAST: 'Push a local variable — the fastest kind of lookup.',
  LOAD_FAST_LOAD_FAST: 'Push two local variables at once.',
  LOAD_GLOBAL: 'Push a global name (or a built-in such as print).',
  LOAD_ATTR: 'Push an attribute (obj.name), or a method to call.',
  LOAD_METHOD: 'Push a method to call.',
  STORE_NAME: 'Pop the top value into a name.',
  STORE_FAST: 'Pop the top value into a local variable.',
  STORE_FAST_STORE_FAST: 'Pop two values into two local variables.',
  STORE_GLOBAL: 'Pop the top value into a global name.',
  STORE_ATTR: 'Store into an attribute (obj.name = …).',
  BINARY_OP: 'Pop two values, apply the operator (+, *, //…), push the result.',
  BINARY_SUBSCR: 'Pop a container and an index, push container[index].',
  STORE_SUBSCR: 'Store into container[index].',
  BINARY_SLICE: 'Push a slice: container[a:b].',
  COMPARE_OP: 'Pop two values, compare them (<, ==…), push True or False.',
  CONTAINS_OP: 'Check “in” / “not in”.',
  IS_OP: 'Check “is” / “is not”.',
  TO_BOOL: 'Turn the top value into True or False.',
  POP_JUMP_IF_FALSE: 'Pop a value; jump if it is false.',
  POP_JUMP_IF_TRUE: 'Pop a value; jump if it is true.',
  POP_JUMP_IF_NONE: 'Pop a value; jump if it is None.',
  POP_JUMP_IF_NOT_NONE: 'Pop a value; jump if it is not None.',
  JUMP_FORWARD: 'Jump ahead.',
  JUMP_BACKWARD: 'Jump back — the end of a loop body.',
  GET_ITER: 'Turn the top value into an iterator (for a for-loop).',
  FOR_ITER: 'Get the next item, or leave the loop when there are none.',
  END_FOR: 'The loop is finished.',
  PUSH_NULL: 'Push an empty slot the call that follows needs.',
  PRECALL: 'Get ready for a call.',
  CALL: 'Call a function with the values above it on the stack.',
  CALL_KW: 'Call a function with keyword arguments.',
  CALL_INTRINSIC_1: 'Run one of the interpreter’s built-in helpers.',
  KW_NAMES: 'Name the keyword arguments of the next call.',
  POP_TOP: 'Throw away the top value (e.g. print’s None).',
  RETURN_VALUE: 'Return the top value from the function.',
  RETURN_CONST: 'Return a constant (often None).',
  MAKE_FUNCTION: 'Build a function object from its code.',
  BUILD_LIST: 'Build a list from the values on the stack.',
  BUILD_TUPLE: 'Build a tuple from the values on the stack.',
  BUILD_MAP: 'Build a dict from the values on the stack.',
  BUILD_SET: 'Build a set from the values on the stack.',
  BUILD_STRING: 'Join pieces into one string (f-strings).',
  BUILD_SLICE: 'Build a slice object (a:b:c).',
  FORMAT_SIMPLE: 'Format a value for an f-string.',
  FORMAT_VALUE: 'Format a value for an f-string.',
  LIST_APPEND: 'Append to the list a comprehension is building.',
  UNPACK_SEQUENCE: 'Split a sequence into separate values (a, b = …).',
  IMPORT_NAME: 'Import a module.',
  IMPORT_FROM: 'Take a name from an imported module.',
  COPY: 'Copy a value on the stack.',
  SWAP: 'Swap two values on the stack.',
  EXTENDED_ARG: 'The next instruction needs a bigger number.',
}

/* ── Ruby (YARV), Lua and Perl: the most common ones ── */
const RUBY: Record<string, string> = {
  putobject: 'Push a constant value.',
  putobject_INT2FIX_0_: 'Push 0.',
  putobject_INT2FIX_1_: 'Push 1.',
  putself: 'Push self (the current object).',
  putnil: 'Push nil.',
  putstring: 'Push a new string.',
  putchilledstring: 'Push a string literal.',
  getlocal: 'Push a local variable.',
  getlocal_WC_0: 'Push a local variable.',
  setlocal: 'Pop into a local variable.',
  setlocal_WC_0: 'Pop into a local variable.',
  send: 'Call a method (with a block).',
  opt_send_without_block: 'Call a method.',
  opt_plus: 'Add the two values on top (+).',
  opt_minus: 'Subtract (−).',
  opt_mult: 'Multiply (*).',
  opt_div: 'Divide (/).',
  opt_mod: 'Remainder (%).',
  opt_lt: 'Compare: less than.',
  opt_le: 'Compare: less or equal.',
  opt_gt: 'Compare: greater than.',
  opt_ge: 'Compare: greater or equal.',
  opt_eq: 'Compare: equal.',
  opt_aref: 'Index: a[i].',
  opt_aset: 'Store: a[i] = v.',
  opt_getconstant_path: 'Push a constant such as STDIN.',
  branchif: 'Jump if the top value is true.',
  branchunless: 'Jump unless the top value is true.',
  jump: 'Jump to another instruction.',
  leave: 'Return from this method or block.',
  dup: 'Copy the top value.',
  pop: 'Throw away the top value.',
  newarray: 'Build an array from the values on the stack.',
  definemethod: 'Define a method.',
}

const LUA: Record<string, string> = {
  VARARGPREP: 'Set up the script’s arguments.',
  MOVE: 'Copy one register to another.',
  LOADI: 'Load a small integer.',
  LOADK: 'Load a constant.',
  LOADNIL: 'Set registers to nil.',
  GETTABUP: 'Read a global (like io or print).',
  GETFIELD: 'Read a field: t.name.',
  SETFIELD: 'Write a field: t.name = v.',
  GETTABLE: 'Read t[k].',
  SETTABLE: 'Write t[k] = v.',
  GETI: 'Read t[i].',
  SETI: 'Write t[i] = v.',
  SELF: 'Get a method ready to call (obj:method).',
  CALL: 'Call a function.',
  TAILCALL: 'Call a function as the last step (reusing this frame).',
  RETURN: 'Return from the function.',
  RETURN0: 'Return nothing.',
  RETURN1: 'Return one value.',
  ADD: 'Add.',
  ADDI: 'Add a small integer.',
  ADDK: 'Add a constant.',
  SUB: 'Subtract.',
  MUL: 'Multiply.',
  MULK: 'Multiply by a constant.',
  DIV: 'Divide.',
  IDIV: 'Integer divide (//).',
  MOD: 'Remainder (%).',
  EQ: 'Compare: equal; skip the next instruction if not.',
  LT: 'Compare: less than.',
  LE: 'Compare: less or equal.',
  TEST: 'Check if a value is truthy.',
  JMP: 'Jump.',
  FORPREP: 'Set up a numeric for-loop.',
  FORLOOP: 'Step the for-loop and jump back if not done.',
  NEWTABLE: 'Make a new table.',
  SETLIST: 'Fill a table with a list of values.',
  CLOSURE: 'Make a function.',
}

const PERL: Record<string, string> = {
  enter: 'Start the program.',
  leave: 'End the program.',
  nextstate: 'Start a new statement.',
  padsv: 'A local (my) scalar variable.',
  padav: 'A local (my) array.',
  const: 'A constant value.',
  gv: 'A global variable or filehandle (like STDIN).',
  sassign: 'Assign a scalar: $a = …',
  aassign: 'Assign a list: @a = …',
  add: 'Add.',
  subtract: 'Subtract.',
  multiply: 'Multiply.',
  divide: 'Divide.',
  print: 'Print.',
  say: 'Print with a newline.',
  readline: 'Read a line of input.',
  pushmark: 'Mark where a list of arguments starts.',
  entersub: 'Call a subroutine.',
  split: 'Split a string.',
  join: 'Join a list into a string.',
  map: 'Transform a list.',
  sort: 'Sort a list.',
  aelem: 'Index an array: $a[i].',
  helem: 'Index a hash: $h{k}.',
}

/** Split one listing line into the instruction, its operands and any comment. */
export function parseInstr(text: string, lang: string): ParsedInstr | null {
  const t = text.replace(/\t/g, ' ').trim()
  if (!t) return null
  let m: RegExpExecArray | null
  if (lang === 'java' || lang === 'kotlin') {
    m = /^\d+:\s*([a-z_0-9]+)\s*([^/]*?)\s*(\/\/.*)?$/.exec(t)
    return m ? { op: m[1], operands: m[2] ?? '', comment: (m[3] ?? '').replace(/^\/\/\s*/, '') } : null
  }
  if (lang === 'python') {
    m = /(?:^|\s)(?:\d+\s+)*(?:>>\s+)?([A-Z][A-Z_0-9]+)(?:\s+(\S+))?\s*(\(.*\))?\s*$/.exec(t)
    return m ? { op: m[1], operands: m[2] ?? '', comment: (m[3] ?? '').replace(/^\(|\)$/g, '') } : null
  }
  if (lang === 'ruby') {
    m = /^\d{4}\s+(\w+)\s*(.*?)\s*(\(\s*\d+\).*)?$/.exec(t)
    return m ? { op: m[1], operands: m[2] ?? '', comment: '' } : null
  }
  if (lang === 'lua') {
    m = /^\d+\s+\[\d+\]\s+([A-Z0-9]+)\s*([^;]*?)\s*(;.*)?$/.exec(t)
    return m ? { op: m[1], operands: m[2] ?? '', comment: (m[3] ?? '').replace(/^;\s*/, '') } : null
  }
  if (lang === 'perl') {
    m = /<.>\s+([a-z_]+)(?:\[([^\]]*)\])?\s*(.*)$/.exec(t)
    return m ? { op: m[1], operands: m[2] ?? '', comment: '' } : null
  }
  // Assembly: "op  a, b   # comment"
  m = /^([A-Za-z][\w.]*)\s*([^#;]*?)\s*([#;].*)?$/.exec(t)
  return m ? { op: m[1], operands: m[2] ?? '', comment: (m[3] ?? '').replace(/^[#;]\s*/, '') } : null
}

/** One sentence on what an instruction does, or null when we have none. */
export function noteFor(op: string, lang: string): string | null {
  if (lang === 'java' || lang === 'kotlin') return jvmNote(op)
  if (lang === 'python') return PY[op] ?? null
  if (lang === 'ruby') return RUBY[op] ?? RUBY[op.replace(/_WC_\d$/, '')] ?? null
  if (lang === 'lua') return LUA[op] ?? null
  if (lang === 'perl') return PERL[op] ?? null
  return x86Note(op)
}

/** Registers, explained once wherever they appear. */
export const REGISTERS = /\b([re]?[abcd]x|[re]?[sd]il?|[re]?[sb]pl?|r(?:8|9|1[0-5])[dwb]?|xmm\d+|[abcd][lh])\b/i
export const REGISTER_NOTE =
  'Names like eax, rdi and rsp are registers: a handful of tiny, very fast storage slots inside the CPU. Values are moved into registers to be worked on.'
export const STACK_NOTE =
  'This is a stack machine: instructions push values onto a stack and pop them off to work on them, instead of using registers.'
