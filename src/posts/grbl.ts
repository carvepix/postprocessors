import { DoOutput, Ternary, UnitType } from '../constants'
import { Point, PostProcessor, Value } from '../types'
import {
  useCommand,
  useCommands,
  useComment,
  useIntegerFormatter,
  useNumberFormatter,
  useScalar,
  useVariable,
  useVariables,
} from '../utils'

export function usePost(unitType: UnitType): PostProcessor {
  const decimals = unitType === UnitType.Millimeter ? 2 : 3
  const xyzF = useNumberFormatter({ decimals })
  const intF = useIntegerFormatter()

  const coordinateMode: Value<number> = useScalar(decimals)
  const splindleState: Value<number> = useScalar(decimals)
  const floodMistState: Value<number> = useScalar(decimals)
  const programState: Value<number> = useScalar(decimals)
  const planeState: Value<number> = useScalar(decimals)
  const unitState: Value<number> = useScalar(decimals)

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
    return coordinateMode.get() === G90.code
  }

  const begin = () => [[G90, G94], [G17], [unitType === UnitType.Millimeter ? G21 : G20]]

  const moveToMachineOrigin = () => {
    altPos.X.set(0)
    altPos.Y.set(0)
    altPos.Z.set(0)

    return [
      [G28, altPos.Z],
      [G28, altPos.X, altPos.Y, altPos.Z],
    ]
  }

  const loadTool = (tool: number) => {
    T.set(tool)
    return [[T]]
  }

  const setSpindleSpeed = (speed: number, clockwise: boolean = true) => {
    S.set(speed)
    return [[S, clockwise ? M3 : M4]]
  }

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
    if (isAbsolute()) {
      absPos.X.set(point.x)
      absPos.Y.set(point.y)
      absPos.Z.set(point.z)
      return [[G0, absPos.X, absPos.Y, absPos.Z]]
    } else {
      incPos.X.set(point.x)
      incPos.Y.set(point.y)
      incPos.Z.set(point.z)
      return [[G0, incPos.X, incPos.Y, incPos.Z]]
    }
  }

  const moveTo = (point: Point, f: number) => {
    F.set(f)
    if (isAbsolute()) {
      absPos.X.set(point.x)
      absPos.Y.set(point.y)
      absPos.Z.set(point.z)
      return [[G1, absPos.X, absPos.Y, absPos.Z, F]]
    } else {
      incPos.X.set(point.x)
      incPos.Y.set(point.y)
      incPos.Z.set(point.z)
      return [[G1, incPos.X, incPos.Y, incPos.Z, F]]
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
    id: 'grbl',
    name: 'Grbl',
    machines: [
      {
        name: 'UltimateBee',
        hasSpindle: Ternary.Maybe,
        hasToolChanger: Ternary.No,
        vendor: {
          name: 'Bulkman3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: 'Oxman',
        hasSpindle: Ternary.Maybe,
        hasToolChanger: Ternary.No,
        vendor: {
          name: 'Bulkman3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: 'QueenBee',
        hasSpindle: Ternary.Maybe,
        hasToolChanger: Ternary.No,
        vendor: {
          name: 'Bulkman3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: 'WorkBee',
        hasSpindle: Ternary.Maybe,
        hasToolChanger: Ternary.No,
        vendor: {
          name: 'Bulkman3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: 'Lead',
        hasSpindle: Ternary.Maybe,
        hasToolChanger: Ternary.No,
        vendor: {
          name: 'Bulkman3d',
          url: 'https://bulkman3d.com',
        },
      },
      {
        name: '3018',
        hasSpindle: Ternary.Yes,
        hasToolChanger: Ternary.No,
      },
    ],
    version: '1.0',
    unitType,
    feedUnit: `${unitType}/min`,
    lineFormatSpec: { newLine: `\r\n` },

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
