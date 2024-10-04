import { DoOutput, Ternary, UnitType } from '../constants'
import { Point, PostProcessor, Value } from '../types'
import { useCommand, useCommands, useComment, useIntegerFormatter, useNumberFormatter, useScalar, useVariable, useVariables } from '../utils'

export function usePost(unitType: UnitType): PostProcessor {
  const xyzF = useNumberFormatter({ decimals: 3 })
  const intF = useIntegerFormatter()

  const coordinateMode: Value<number> = useScalar()
  const splindleState: Value<number> = useScalar()
  const floodMistState: Value<number> = useScalar()
  const programState: Value<number> = useScalar()
  const planeState: Value<number> = useScalar()
  const unitState: Value<number> = useScalar()

  //commands
  const { M3, M4, M5 } = useCommands('M', [3, 4, 5], DoOutput.IfChanged, intF, splindleState)
  const { M7, M8, M9 } = useCommands('M', [7, 8, 9], DoOutput.IfChanged, intF, floodMistState)
  const { M0, M1, M30 } = useCommands('M', [0, 1, 30], DoOutput.IfChanged, intF, programState)
  const { G20, G21 } = useCommands('G', [20, 21], DoOutput.IfChanged, intF, unitState)
  const { G17, G18, G19 } = useCommands('G', [17, 18, 19], DoOutput.IfChanged, intF, planeState)
  const { G90, G91 } = useCommands('G', [90, 91], DoOutput.IfChanged, intF, coordinateMode)
  const { G0, G1, G94 } = useCommands('G', [0, 1, 28, 94], DoOutput.IfChanged, intF)
  const G28 = useCommand('G', 28, DoOutput.Always, intF)

  //variables
  const F = useVariable('F', DoOutput.IfChanged, intF)
  const S = useVariable('S', DoOutput.IfChanged, intF)
  const absPos = useVariables(['X', 'Y', 'Z'], DoOutput.IfChanged, xyzF)
  const incPos = useVariables(['X', 'Y', 'Z'], DoOutput.IfChanged, xyzF)
  const altPos = useVariables(['X', 'Y', 'Z'], DoOutput.Always, xyzF)
  const T = useVariable('T', DoOutput.IfChanged, intF)

  function isAbsolute() {
    return coordinateMode.get() === G90.code()
  }

  const begin = () => [[G90, G94], [G17], [unitType === UnitType.Millimeter ? G21 : G20]]

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
    description: 'Generic milling post for Grbl.',
    vendor: {
      name: 'grbl',
      url: 'https://github.com/gnea/grbl/wiki',
    },
    machines: [
      {
        name: 'UltimateBee',
        vendor: {
          name: 'Bulkman 3d',
          url: 'https://bulkman3d.com',
        },
      },{
        name: 'QueenBee',
        vendor: {
          name: 'Bulkman 3d',
          url: 'https://bulkman3d.com',
        },
      },{
        name: 'WorkBee',
        vendor: {
          name: 'Bulkman 3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: 'Generic 3018',
      },
    ],
    version: '1.0',
    feedUnit: `${unitType} per minute`,
    lineFormatSpec: { newLine: `\n\r` },
    hasSpindle: Ternary.Maybe,
    hasToolChanger: Ternary.Maybe,
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
