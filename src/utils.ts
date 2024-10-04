import { TokenType, DoOutput } from './constants'
import { CommentFormatSpec, NumberFormatterSpec, Token, TokenFormatter, Value } from './types'

export function useCommand(_prefix: string, _code: number, _doOutput: DoOutput, _formatter: TokenFormatter, _value?: Value<number>): Token {
  function prefix() {
    return _prefix
  }

  function set(v: number | undefined): Token {
    if (_value && v !== undefined) {
      _value.set(v)
    }
    return useCommand(_prefix, _code, _doOutput, _formatter, _value)
  }

  function get(): number | undefined {
    if (_value) {
      return _value.get()
    }
  }

  function commit(): void {
    if (_value) {
      _value.commit()
    }
  }

  function reset(): void {
    if (_value) {
      _value.reset()
    }
  }

  function changed(): boolean {
    if (_value) {
      return _value.changed()
    } else {
      return true
    }
  }

  function type() {
    return TokenType.Command
  }

  function formatter() {
    return _formatter
  }

  function code() {
    return _code
  }

  return {
    prefix,
    get,
    set,
    changed,
    type,
    formatter,
    code,
    commit,
    reset,
    outputValue: code,
    doOutput: _doOutput,
  }
}

export function useVariable(_prefix: string, _doOutput: DoOutput, _formatter: TokenFormatter, _value: Value<number> = useScalar()): Token {
  function prefix() {
    return _prefix
  }

  function set(v: number | undefined): Token {
    if (_value && v !== undefined) {
      _value.set(v)
    }
    return useVariable(_prefix, _doOutput, _formatter, _value)
  }

  function commit(): void {
    _value.commit()
  }

  function reset(): void {
    _value.reset()
  }

  function get(): number | undefined {
    if (_value) {
      return _value.get()
    }
  }

  function changed(): boolean {
    if (_value) {
      return _value.changed()
    } else {
      return true
    }
  }

  function type() {
    return TokenType.Variable
  }

  function formatter() {
    return _formatter
  }

  return {
    prefix,
    get,
    set,
    changed,
    type,
    formatter,
    code: () => 0,
    commit,
    reset,
    outputValue: get,
    doOutput: _doOutput,
  }
}

export function useScalar(value?: number, commitedValue?: number): Value<number> {
  let _committedValue = commitedValue
  let _value = value

  function set(value: number) {
    _value = value
    return useScalar(value, _committedValue)
  }
  function get(): number | undefined {
    return _value
  }
  function changed(): boolean {
    return _committedValue !== _value
  }
  function commit() {
    _committedValue = _value
  }
  function reset() {
    _committedValue = undefined
  }
  return {
    set,
    commit,
    reset,
    get,
    changed,
  }
}

function useNumberFormatterSpec(overrides: Partial<NumberFormatterSpec> = {}): NumberFormatterSpec {
  const def: NumberFormatterSpec = {
    decimals: 6,
    forceSign: false,
    separator: '.',
    scale: 1,
    offset: 0,
    forceSeparator: false,
  }
  return { ...def, ...overrides }
}

export function useNumberFormatter(specification: Partial<NumberFormatterSpec> = {}): TokenFormatter {
  const spec = useNumberFormatterSpec(specification)
  return (token: Token): string | undefined => {
    if (token.outputValue() === undefined) {
      return
    }
    const offset = spec.offset
    const scale = spec.scale
    const decimals = spec.decimals
    const value = token.outputValue() as number
    let v = (value + offset) * scale

    if (spec.maximum && value > spec.maximum) {
      v = spec.maximum
    }
    if (spec.minimum && value < spec.minimum) {
      v = spec.minimum
    }
    const positive = v >= 0
    const lv = positive ? Math.floor(v) : -Math.floor(v)
    const rv = Math.floor(Math.pow(10, decimals) * (v - lv))

    let l = lv.toString()
    let r = rv.toString()
    while (r.length < decimals) {
      r = `${0}${r}`
    }
    if (spec.minDigitsRight !== undefined) {
      while (r.length < spec.minDigitsRight) {
        r = `${r}${0}`
      }
    } else {
      while (r[r.length - 1] === '0') {
        r = r.substring(0, r.length - 1)
      }
    }
    if (spec.minDigitsLeft !== undefined) {
      while (l.length < spec.minDigitsLeft) {
        l = `${0}${l}`
      }
    }
    const strings = [token.prefix(), !positive ? '-' : spec.forceSign ? '+' : undefined, l, r.length || spec.forceSeparator ? spec.separator : undefined, r]
    return strings.join('')
  }
}

export function useIntegerFormatter() {
  return useNumberFormatter({ decimals: 0 })
}

function useCommentFormatSpec(specification: Partial<CommentFormatSpec> = {}): CommentFormatSpec {
  function sanitize(value: string) {
    return value.replace(/[^a-zA-Z0-9_\s\-.=]/gi, '').substring(0, 30)
  }
  const def = {
    begin: '(',
    end: ')',
    sanitize,
  }
  return { ...def, ...specification }
}

export function useComment(commentFormatSpec: Partial<CommentFormatSpec> = {}) {
  const spec = useCommentFormatSpec(commentFormatSpec)
  return (comment: string) => `${spec.begin}${spec.sanitize(comment)}${spec.end}`
}

export function useCommands(prefix: string, codes: number[], doOutput: DoOutput, formatter: TokenFormatter, _value?: Value<number>): Record<string, Token> {
  const result: Record<string, Token> = {}
  codes.forEach((code) => {
    result[`${prefix}${code}`] = useCommand(prefix, code, doOutput, formatter, _value)
  })
  return result
}

export function useVariables(names: string[], doOutput: DoOutput, formatter: TokenFormatter): Record<string, Token> {
  const result: Record<string, Token> = {}
  names.forEach((name) => {
    result[name] = useVariable(name, doOutput, formatter)
  })
  return result
}
