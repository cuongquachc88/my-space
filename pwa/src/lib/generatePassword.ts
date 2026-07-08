export interface GenerateOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
}

const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER   = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS  = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export function generatePassword(opts: GenerateOptions): string {
  const sets: string[] = []
  if (opts.upper)   sets.push(UPPER)
  if (opts.lower)   sets.push(LOWER)
  if (opts.digits)  sets.push(DIGITS)
  if (opts.symbols) sets.push(SYMBOLS)
  if (sets.length === 0) throw new Error('No character set selected')
  if (!Number.isInteger(opts.length) || opts.length < 1) throw new Error('length must be a positive integer')
  if (opts.length < sets.length) throw new Error(`length must be at least ${sets.length}`)

  const alphabet = sets.join('')
  const guaranteed = sets.map(set => randomChar(set))
  const remaining = Array.from({ length: opts.length - guaranteed.length }, () => randomChar(alphabet))
  const all = [...guaranteed, ...remaining]

  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all.join('')
}

function randomChar(charset: string): string { return charset[randomInt(charset.length)] }
function randomInt(max: number): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}
