/** Judge language id → the Monaco language used to colour and tokenize it. */
export const MONACO_LANG: Record<string, string> = {
  shell: 'shell',
  csharp: 'csharp',
  objectivec: 'objective-c',
  pascal: 'pascal',
  scheme: 'scheme',
  // No dedicated Monaco grammar — borrow the closest one for highlighting.
  ocaml: 'fsharp',
  crystal: 'ruby',
  groovy: 'java',
  d: 'cpp',
  zig: 'rust',
  nim: 'python',
  commonlisp: 'clojure',
  haskell: 'plaintext',
}
