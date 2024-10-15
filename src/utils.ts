import { TokenType, DoOutput } from './constants'
import { CommentFormatSpec, NumberFormatterSpec, Token, TokenFormatter, Value } from './types'

export function useCommand(
  prefix: string,
  code: number,
  doOutput: DoOutput,
  formatter: TokenFormatter,
  _value?: Value<number>,
): Token {
  function set(v: number | undefined) {
    if (_value && v !== undefined) {
      _value.set(v)
    }
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

  return {
    prefix,
    get,
    set,
    changed,
    type: TokenType.Command,
    format: formatter,
    code,
    commit,
    reset,
    outputValue: () => code,
    doOutput,
  }
}

export function useVariable(
  prefix: string,
  doOutput: DoOutput,
  formatter: TokenFormatter,
  value: Value<number> = useScalar(3),
): Token {
  function set(v: number | undefined) {
    if (value && v !== undefined) {
      value.set(v)
    }
  }

  function commit(): void {
    value.commit()
  }

  function reset(): void {
    value.reset()
  }

  function changed(): boolean {
    if (value) {
      return value.changed()
    } else {
      return true
    }
  }

  return {
    prefix,
    get: value.get,
    set,
    changed,
    type: TokenType.Variable,
    format: formatter,
    code: 0,
    commit,
    reset,
    outputValue: value.get,
    doOutput,
  }
}

export function useScalar(decimals: number): Value<number> {
  let _committedValue: number | undefined = undefined
  let _value: number | undefined = undefined
  const multiplier = Math.pow(10, decimals)

  function set(value: number) {
    _value = Math.round(value * multiplier) / multiplier
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
    decimals: 3,
    forceSign: false,
    separator: '.',
    scale: 1,
    offset: 0,
    forceSeparator: false,
    maximum: Infinity,
    minimum: -Infinity,
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
    const value = token.outputValue() as number
    let v = (value + offset) * scale

    if (value > spec.maximum) {
      v = spec.maximum
    }
    if (value < spec.minimum) {
      v = spec.minimum
    }
    const positive = v >= 0
    const pv = Math.abs(v)

    let [l, r] = (pv + '').split('.')
    if (r !== undefined) {
      if (spec.minDigitsRight !== undefined) {
        while (r.length < spec.minDigitsRight) {
          r = `${r}${0}`
        }
      }
    }
    if (spec.minDigitsLeft !== undefined) {
      while (l.length < spec.minDigitsLeft) {
        l = `${0}${l}`
      }
    }
    const sign = !positive ? '-' : spec.forceSign ? '+' : ''
    const sep = (r !== undefined && r.length > 0) || spec.forceSeparator ? spec.separator : ''
    const rt = r === undefined ? '' : r
    // string concatenation is much faster than array<string>.join and string interpolation
    return token.prefix + sign + l + sep + rt
  }
}

export function useIntegerFormatter() {
  return (token: Token): string | undefined => {
    if (token.outputValue() === undefined) {
      return
    }
    return token.prefix + Math.round(token.outputValue() as number)
  }
}

function useCommentFormatSpec(specification: Partial<CommentFormatSpec> = {}): CommentFormatSpec {
  function sanitize(value: string) {
    return value.replace(/[^a-zA-Z0-9_\s\-.=/:]/gi, '').substring(0, 30)
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

export function useCommands(
  prefix: string,
  codes: number[],
  doOutput: DoOutput,
  formatter: TokenFormatter,
  _value?: Value<number>,
): Record<string, Token> {
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
