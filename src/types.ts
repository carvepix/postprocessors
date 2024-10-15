import { DoOutput, Ternary, TokenType, UnitType } from './constants'

export interface Token {
  readonly prefix : string
  readonly code: number
  readonly format: TokenFormatter
  set(v: number | undefined): void
  get(): number | undefined
  outputValue(): number | undefined
  commit(): void
  reset(): void
  changed(): boolean
  readonly type: TokenType
  readonly doOutput: DoOutput
}

export interface Value<T> {
  set: (value: number) => void
  commit: () => void
  reset(): void
  changed: () => boolean
  get: () => number | undefined
}

export type TokenFormatter = (token: Token) => string | undefined

export type Formatter = (value: string) => string

export interface Writer {
  writeTokens: (...tokens: Token[]) => void
  lineNumber: () => number
  writeComment: (comment: string) => void
  writeLine: (comment: string) => void
}

export interface NumberFormatterSpec {
  readonly decimals: number,
  readonly forceSign: boolean
  readonly separator: string
  readonly scale: number
  readonly offset: number
  readonly forceSeparator: boolean
  readonly minimum: number
  readonly maximum: number
  readonly minDigitsLeft?: number
  readonly minDigitsRight?: number
}

export interface LineNumberFormatSpec {
  readonly prefix: string
  readonly start: number
  readonly increment: number
}

export interface LineFormatSpec {
  readonly tokenSeparator: string
  readonly newLine: string
}

export interface CommentFormatSpec {
  readonly begin: string
  readonly end: string
  readonly sanitize: (value: string) => string
}

export interface Vendor {
  name: string
  url: string
}

export interface Vector3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface Machine {
  readonly name?: string,
  readonly hasSpindle: Ternary,
  readonly hasToolChanger: Ternary,
  readonly workingDimensions?: Vector3
  readonly vendor?: Vendor
  readonly capability?: number
}

export interface PostProcessor {
  readonly extension: string
  readonly id: string
  readonly name: string
  readonly description: string
  readonly machines: Machine[]
  readonly version: string
  readonly unitType: UnitType
  readonly feedUnit: string
  readonly lineFormatSpec: Partial<LineFormatSpec>
  readonly lineNumberFormatSpec?: Partial<LineNumberFormatSpec>
  readonly header?: string
  readonly footer?: string
  begin: () => Token[][]
  moveToMachineOrigin: () => Token[][]
  loadTool: (t: number) => Token[][]
  setSpindleSpeed: (s: number, clockwise?: boolean) => Token[][]
  stopSpindle: () => Token[][]
  startFlood: () => Token[][]
  startMist: () => Token[][]
  stopFloodAndMist: () => Token[][]
  setAbsolutePositioning: () => Token[][]
  setIncrementalPositioning: () => Token[][]
  fastMoveTo: (point: Point) => Token[][]
  moveTo: (point: Point, f: number) => Token[][]
  end: () => Token[][]
  comment: (text: string) => string
}

export interface Point {
  readonly x: number
  readonly y: number
  readonly z: number
}
