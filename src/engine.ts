import { Writable } from 'node:stream'
import { DoOutput, TokenType } from './constants'
import { LineFormatSpec, LineNumberFormatSpec, Token } from './types'

function useLineFormatSpec(specification: Partial<LineFormatSpec> = {}): LineFormatSpec {
  const def = {
    tokenSeparator: ' ',
    newLine: `\n\r`,
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

export function useTokensToString(lineFormatSpec: Partial<LineFormatSpec>, lineNumberFormatSpec?: Partial<LineNumberFormatSpec>) {
  const lfs = useLineFormatSpec(lineFormatSpec)
  const lnfs: undefined | LineNumberFormatSpec = lineNumberFormatSpec && useLineNumberFormatSpec(lineNumberFormatSpec)

  let _lineNumber: number = 0
  let _lastCommand: Token | undefined

  function toString(...tokens: Token[]): string {
    const strings: string[] = tokens
      .map((t) => {
        if (t.type() === TokenType.Command) {
          t.set(t.code())
          if (_lastCommand === undefined) {
            _lastCommand = t
            t.commit()
            return t.formatter()(t)
          } else if (t.code() === _lastCommand.code() && t.prefix() === _lastCommand.prefix()) {
            _lastCommand = t
            t.commit()
            if (t.doOutput === DoOutput.Always) {
              return t.formatter()(t)
            }
          } else {
            _lastCommand = t
            if (t.doOutput === DoOutput.Always || t.changed()) {
              t.commit()
              return t.formatter()(t)
            } else {
              t.commit()
            }
          }
        } else {
          if (t.doOutput === DoOutput.Always || t.changed()) {
            t.commit()
            return t.formatter()(t)
          } else {
            t.commit()
          }
        }
      })
      .filter((s) => s !== undefined)

    if (strings.length > 0) {
      if (lnfs) {
        const out = lnfs.start + _lineNumber * lnfs.increment
        strings.splice(0, 0, `${lnfs.prefix}${out}`)
      }
      _lineNumber++
      tokens.forEach((t) => {
        t.commit()
      })
      return strings.join(lfs.tokenSeparator)
    } else {
      return ''
    }
  }

  return toString
}

export function useWrite(writable: Writable, lineFormatSpec: Partial<LineFormatSpec>) {
  const lfs = useLineFormatSpec(lineFormatSpec)

  let firstLine = true

  function write(lines: string[]) {
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
