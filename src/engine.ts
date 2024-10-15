import { Writable } from 'node:stream'
import { DoOutput, TokenType } from './constants'
import { LineFormatSpec, LineNumberFormatSpec, Token } from './types'

function useLineFormatSpec(specification: Partial<LineFormatSpec> = {}): LineFormatSpec {
  const def = {
    tokenSeparator: ' ',
    newLine: '\r\n',
  }
  return { ...def, ...specification }
}

function useLineNumberFormatSpec(specification: Partial<LineNumberFormatSpec> = {}): LineNumberFormatSpec {
  const def = {
    prefix: 'N',
    increment: 5,
    start: 5,
  }
  return { ...def, ...specification }
}

export function useTokensToString(
  lineFormatSpec: Partial<LineFormatSpec>,
  lineNumberFormatSpec?: Partial<LineNumberFormatSpec>,
) {
  const lfs = useLineFormatSpec(lineFormatSpec)
  const lnfs: undefined | LineNumberFormatSpec = lineNumberFormatSpec && useLineNumberFormatSpec(lineNumberFormatSpec)

  let _lineNumber: number = 0
  let _lastCommand: Token | undefined

  function toString(...tokens: Token[]): string {
    let s: string = ''
    tokens.forEach((t) => {
      if (t.type === TokenType.Command) {
        t.set(t.code)
        if (_lastCommand === undefined) {
          _lastCommand = t
          t.commit()
          if (s.length > 0) s += lfs.tokenSeparator
          s += t.format(t)
        } else if (t.code === _lastCommand.code && t.prefix === _lastCommand.prefix) {
          _lastCommand = t
          t.commit()
          if (t.doOutput === DoOutput.Always) {
            if (s.length > 0) s += lfs.tokenSeparator
            s += t.format(t)
          }
        } else {
          _lastCommand = t
          if (t.changed() || t.doOutput === DoOutput.Always) {
            t.commit()
            if (s.length > 0) s += lfs.tokenSeparator
            s += t.format(t)
          } else {
            t.commit()
          }
        }
      } else {
        if (t.changed() || t.doOutput === DoOutput.Always) {
          t.commit()
          if (s.length > 0) s += lfs.tokenSeparator
          s += t.format(t)
        } else {
          t.commit()
        }
      }
    })
    if (s.length > 0) {
      if (lnfs !== undefined) {
        s = lnfs.prefix + (lnfs.start + _lineNumber * lnfs.increment) + lfs.tokenSeparator + s
      }
      _lineNumber++
    }
    return s
  }

  return toString
}

export function useWrite(writable: Writable, lineFormatSpec: Partial<LineFormatSpec>): (lines: string[]) => void {
  const lfs = useLineFormatSpec(lineFormatSpec)

  let firstLine = true

  function write(lines: string[]): void {
    lines.forEach((line: string) => {
      if (line !== '') {
        if (!firstLine) {
          writable.write(lfs.newLine)
        } else {
          firstLine = false
        }
        writable.write(line)
      }
    })
  }
  return write
}
