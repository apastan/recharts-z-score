import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import s from './App.module.scss'
import { Fragment } from 'react'

type Point = {
  name: string
  uv: number
  pv: number
}

type DataKeys = keyof Omit<Point, 'name'>

type DotProps = {
  cx: number
  cy: number
  index: number
}

const data = [
  { name: 'Page A', uv: 4000, pv: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398 },
  { name: 'Page C', uv: 2000, pv: 9800 },
  { name: 'Page D', uv: 2780, pv: 3908 },
  { name: 'Page E', uv: 1890, pv: 4800 },
  { name: 'Page F', uv: 2390, pv: 3800 },
  { name: 'Page G', uv: 3490, pv: 4300 },
]

type DataWithZScores = (Point & {
  zScorePv: number
  zScoreUv: number
  pvIsAnomaly: boolean
  uvIsAnomaly: boolean
})[]

const mean = (arr: number[]) =>
  arr.reduce((sum, val) => sum + val, 0) / arr.length

const stdDev = (arr: number[], meanVal: number) =>
  Math.sqrt(
    arr.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / arr.length
  )

const calculateZScores = (data: Point[]) => {
  // Извлечение значений pv и uv
  const pvValues: number[] = data.map((d) => d.pv)
  const uvValues: number[] = data.map((d) => d.uv)

  // Расчёт среднего
  const pvMean: number = mean(pvValues)
  const uvMean: number = mean(uvValues)

  // Расчёт стандартного отклонения
  const pvStdDev: number = stdDev(pvValues, pvMean)
  const uvStdDev: number = stdDev(uvValues, uvMean)

  // Расчёт z-score для каждой точки
  const dataWithZScore = data.map((item) => {
    const zScorePv = (item.pv - pvMean) / pvStdDev
    const zScoreUv = (item.uv - uvMean) / uvStdDev

    return {
      ...item,
      zScorePv,
      zScoreUv,
      pvIsAnomaly: Math.abs(zScorePv) > 1,
      uvIsAnomaly: Math.abs(zScoreUv) > 1,
    }
  })

  const zScoreBrakePoints = {
    uv: {
      zScorePlusOne: Number((uvMean + uvStdDev).toFixed(2)),
      zScoreMinusOne: Number((uvMean - uvStdDev).toFixed(2)),
    },
    pv: {
      zScorePlusOne: Number((pvMean + pvStdDev).toFixed(2)),
      zScoreMinusOne: Number((pvMean - pvStdDev).toFixed(2)),
    },
  }

  return { dataWithZScore, zScoreBrakePoints }
}

const { dataWithZScore, zScoreBrakePoints } = calculateZScores(data)

const createAnomalyXRanges = (
  data: DataWithZScores,
  row: DataKeys
): number[] => {
  const breakpoints: number[] = []
  const totalSegments = data.length - 1
  const segmentWidth = 100 / totalSegments

  const zPlusOne = zScoreBrakePoints[row].zScorePlusOne
  const zMinusOne = zScoreBrakePoints[row].zScoreMinusOne

  for (let i = 1; i < data.length; i++) {
    const prevVal = data[i - 1][row]
    const currVal = data[i][row]
    const segmentStartX = (i - 1) * segmentWidth

    // helper to find intersection offset
    const checkIntersection = (threshold: number) => {
      const crosses =
        (prevVal - threshold) * (currVal - threshold) < 0 ||
        prevVal === threshold ||
        currVal === threshold
      if (!crosses) return null

      const offsetInSegment = (threshold - prevVal) / (currVal - prevVal)
      if (offsetInSegment < 0 || offsetInSegment > 1) return null

      return segmentStartX + offsetInSegment * segmentWidth
    }

    const crossPlus = checkIntersection(zPlusOne)
    if (crossPlus !== null) breakpoints.push(crossPlus)

    const crossMinus = checkIntersection(zMinusOne)
    if (crossMinus !== null) breakpoints.push(crossMinus)
  }

  return breakpoints.sort((a, b) => a - b)
}

const uvBreakPoints = createAnomalyXRanges(dataWithZScore, 'uv')
const pvBreakPoints = createAnomalyXRanges(dataWithZScore, 'pv')

const prepareOffsets = (
  dataWithZScore: DataWithZScores,
  row: DataKeys,
  breakpoints: number[],
  color: string,
  anomalyColor: string
) => {
  const result = []
  let currentColor: string
  const key = `${row}IsAnomaly` as 'uvIsAnomaly' | 'pvIsAnomaly'
  const isFirstPointAnomaly = dataWithZScore[0][key]

  if (isFirstPointAnomaly) {
    currentColor = anomalyColor
  } else {
    currentColor = color
  }

  result.push({ color: currentColor, offset: 0 })

  for (const breakpoint of breakpoints) {
    result.push({ color: currentColor, offset: breakpoint })
    currentColor = currentColor === anomalyColor ? color : anomalyColor
    result.push({ color: currentColor, offset: breakpoint })
  }

  result.push({ color: currentColor, offset: 100 })

  return result
}

function App() {
  return (
    <div className={s.root}>
      <h1 className={s.heading}>
        Надеюсь, что правильно понял, какие участки нужно закрасить красным :)){' '}
        <br />
        Красное кажется несимметричным из-за графика со сглаживание - ниже
        другой график, там все ОК
      </h1>
      <>
        <div className={s.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dataWithZScore}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="gradientUV" x1="0" y1="0" x2="1" y2="0">
                  {prepareOffsets(
                    dataWithZScore,
                    'uv',
                    uvBreakPoints,
                    '#82ca9d',
                    'red'
                  ).map((point, i) => {
                    return (
                      <Fragment key={`uv-stop-${i}`}>
                        <stop
                          offset={`${point.offset}%`}
                          stopColor={point.color}
                        />
                      </Fragment>
                    )
                  })}
                </linearGradient>

                <linearGradient id="gradientPV" x1="0" y1="0" x2="1" y2="0">
                  {prepareOffsets(
                    dataWithZScore,
                    'pv',
                    pvBreakPoints,
                    '#8884d8',
                    'red'
                  ).map((point, i) => {
                    return (
                      <Fragment key={`pv-stop-${i}`}>
                        <stop
                          offset={`${point.offset}%`}
                          stopColor={point.color}
                        />
                      </Fragment>
                    )
                  })}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pv"
                stroke="url(#gradientPV)"
                activeDot={(props: unknown) => {
                  const { cx, cy, index } = props as DotProps
                  return (
                    <circle
                      key={`pv-active-${index}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={
                        dataWithZScore[index].pvIsAnomaly ? 'red' : '#8884d8'
                      }
                    />
                  )
                }}
                dot={({ cx, cy, index }: DotProps) => {
                  return (
                    <circle
                      key={`pv-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        dataWithZScore[index].pvIsAnomaly ? 'red' : '#8884d8'
                      }
                    />
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="uv"
                stroke="url(#gradientUV)"
                activeDot={(props: unknown) => {
                  const { cx, cy, index } = props as DotProps
                  return (
                    <circle
                      key={`uv-active-${index}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={
                        dataWithZScore[index].uvIsAnomaly ? 'red' : '#82ca9d'
                      }
                    />
                  )
                }}
                dot={({ cx, cy, index }: DotProps) => {
                  return (
                    <circle
                      key={`uv-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        dataWithZScore[index].uvIsAnomaly ? 'red' : '#82ca9d'
                      }
                    />
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={s.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dataWithZScore}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="gradientUV" x1="0" y1="0" x2="1" y2="0">
                  {prepareOffsets(
                    dataWithZScore,
                    'uv',
                    uvBreakPoints,
                    '#82ca9d',
                    'red'
                  ).map((point, i) => {
                    return (
                      <Fragment key={`uv-stop-${i}`}>
                        <stop
                          offset={`${point.offset}%`}
                          stopColor={point.color}
                        />
                      </Fragment>
                    )
                  })}
                </linearGradient>

                <linearGradient id="gradientPV" x1="0" y1="0" x2="1" y2="0">
                  {prepareOffsets(
                    dataWithZScore,
                    'pv',
                    pvBreakPoints,
                    '#8884d8',
                    'red'
                  ).map((point, i) => {
                    return (
                      <Fragment key={`pv-stop-${i}`}>
                        <stop
                          offset={`${point.offset}%`}
                          stopColor={point.color}
                        />
                      </Fragment>
                    )
                  })}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="linear"
                dataKey="pv"
                stroke="url(#gradientPV)"
                activeDot={(props: unknown) => {
                  const { cx, cy, index } = props as DotProps
                  return (
                    <circle
                      key={`pv-active-${index}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={
                        dataWithZScore[index].pvIsAnomaly ? 'red' : '#8884d8'
                      }
                    />
                  )
                }}
                dot={({ cx, cy, index }: DotProps) => {
                  return (
                    <circle
                      key={`pv-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        dataWithZScore[index].pvIsAnomaly ? 'red' : '#8884d8'
                      }
                    />
                  )
                }}
              />
              <Line
                type="linear"
                dataKey="uv"
                stroke="url(#gradientUV)"
                activeDot={(props: unknown) => {
                  const { cx, cy, index } = props as DotProps
                  return (
                    <circle
                      key={`uv-active-${index}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={
                        dataWithZScore[index].uvIsAnomaly ? 'red' : '#82ca9d'
                      }
                    />
                  )
                }}
                dot={({ cx, cy, index }: DotProps) => {
                  return (
                    <circle
                      key={`uv-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        dataWithZScore[index].uvIsAnomaly ? 'red' : '#82ca9d'
                      }
                    />
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>
    </div>
  )
}

export default App
