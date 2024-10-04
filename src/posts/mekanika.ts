import { DoOutput, Ternary, UnitType } from '../constants'
import { Point, PostProcessor, Value } from '../types'
import { useCommand, useCommands, useComment, useIntegerFormatter, useNumberFormatter, useScalar, useVariable, useVariables } from '../utils'

export function usePost(unitType: UnitType): PostProcessor {
  const realF = useNumberFormatter({ decimals: 3, forceSeparator: true })
  const intF = useIntegerFormatter()
  const commF = useIntegerFormatter()

  const coordinateMode: Value<number> = useScalar()
  const splindleState: Value<number> = useScalar()
  const floodMistState: Value<number> = useScalar()
  const programState: Value<number> = useScalar()
  const planeState: Value<number> = useScalar()
  const unitState: Value<number> = useScalar()

  //commands
  const { M3, M4, M5 } = useCommands('M', [3, 4, 5], DoOutput.IfChanged, commF, splindleState)
  const { M7, M8, M9 } = useCommands('M', [7, 8, 9], DoOutput.IfChanged, commF, floodMistState)
  const { M0, M1, M30 } = useCommands('M', [0, 1, 30], DoOutput.IfChanged, commF, programState)
  const { G20, G21 } = useCommands('G', [20, 21], DoOutput.IfChanged, commF, unitState)
  const { G17, G18, G19 } = useCommands('G', [17, 18, 19], DoOutput.IfChanged, commF, planeState)
  const { G90, G91 } = useCommands('G', [90, 91], DoOutput.IfChanged, commF, coordinateMode)
  const { G0, G1, G94 } = useCommands('G', [0, 1, 28, 94], DoOutput.IfChanged, commF)
  const G28 = useCommand('G', 28, DoOutput.Always, commF)
  const G91_1 = useCommand('G', 91.1, DoOutput.Always, realF)

  //variables
  const F = useVariable('F', DoOutput.IfChanged, realF)
  const S = useVariable('S', DoOutput.IfChanged, intF)
  const absPos = useVariables(['X', 'Y', 'Z'], DoOutput.IfChanged, realF)
  const incPos = useVariables(['X', 'Y', 'Z'], DoOutput.IfChanged, realF)
  const altPos = useVariables(['X', 'Y', 'Z'], DoOutput.Always, realF)
  const T = useVariable('T', DoOutput.IfChanged, intF)

  function isAbsolute() {
    return coordinateMode.get() === G90.code()
  }

  const begin = () => [[G90, G94, G17, G91_1], [unitType === UnitType.Millimeter ? G21 : G20]]

  const moveToMachineOrigin = () => [
    // first move to Z origin to avoid any collision
    [G28, altPos.Z.set(0)],
    [G28, altPos.X.set(0), altPos.Y.set(0), altPos.Z.set(0)],
  ]

  const loadTool = (tool: number) => [[T.set(tool)]]

  const setSpindleSpeed = (speed: number, clockwise: boolean = true) => [[S.set(speed), clockwise ? M3 : M4]]

  const stopSpindle = () => [[M5]]

  const setAbsolutePositioning = () => {
    return [[G90]]
  }

  const setIncrementalPositioning = () => {
    if (isAbsolute()) {
      absPos.X.reset()
      absPos.Y.reset()
      absPos.Z.reset()
    }
    return [[G91]]
  }

  const fastMoveTo = (point: Point) => {
    const { x, y, z } = point
    if (isAbsolute()) {
      return [[G0, absPos.X.set(x), absPos.Y.set(y), absPos.Z.set(z)]]
    } else {
      return [[G0, incPos.X.set(x), incPos.Y.set(y), incPos.Z.set(z)]]
    }
  }

  const moveTo = (point: Point, f: number) => {
    const { x, y, z } = point
    if (isAbsolute()) {
      return [[G1, absPos.X.set(x), absPos.Y.set(y), absPos.Z.set(z), F.set(f)]]
    } else {
      return [[G1, incPos.X.set(x), incPos.Y.set(y), incPos.Z.set(z), F.set(f)]]
    }
  }

  const startFlood = () => [[M7]]
  const startMist = () => [[M8]]
  const stopFloodAndMist = () => [[M9]]

  const end = () => [...stopFloodAndMist(), ...stopSpindle(), ...setAbsolutePositioning(), [M30]]

  const comment = useComment()

  return {
    extension: 'nc',
    vendor: {
      name: 'Mekanika',
      url: 'https://www.mekanika.io',
    },
    machines: [{ name: 'EVO' }, { name: 'PRO' }, { name: 'FAB' },],
    description: 'Post for the Mekanika CNC routers used with a PlanetCNC controller.',
    version: '1.0',
    feedUnit: `${unitType} per minute`,
    lineFormatSpec: { newLine: `\n\r` },
    lineNumberFormatSpec: { prefix: 'N', start: 1, increment: 5 },
    hasSpindle: Ternary.Maybe,
    hasToolChanger: Ternary.Maybe,
    header: '%',
    footer: '%',
    begin,
    moveToMachineOrigin,
    loadTool,
    setSpindleSpeed,
    stopSpindle,
    startFlood,
    startMist,
    stopFloodAndMist,
    setAbsolutePositioning,
    setIncrementalPositioning,
    fastMoveTo,
    moveTo,
    end,
    comment,
  }
}
