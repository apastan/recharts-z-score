import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import s from './App.module.scss';

type DataKeys = keyof  Omit<Point, 'name' | 'amt'>

type Point = {
    name: string
    uv: number
    pv: number
    amt: number
}

type ZScoreThresholds = {
    zScorePlusOne: number
    zScoreMinusOne: number
};

type GradientOffsets = {
    start: number
    end: number
};

type DotProps = {
    cx: number
    cy: number
    index: number
};

const data = [
    { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
    { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
    { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
    { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
    { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
    { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

// const DataKeysColors: Record<DataKeys , {mainColor: string, zScoreColor: string, dataKey: DataKeys}> = {'uv': {dataKey: 'uv', mainColor: "#", zScoreColor: "red"},   'pv': {dataKey: 'pv', mainColor: "#", zScoreColor: "red"}}

// Calculate mean
const mean = (arr: number[]) => arr.reduce((sum, val) => sum + val, 0) / arr.length;

// Calculate standard deviation
const stdDev = (arr: number[], meanVal: number) =>
    Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / arr.length);

// Calculate z-score thresholds
const calculateZScoreThresholds = (data: Point[]) => {
    const uvValues = data.map((d) => d.uv);
    const pvValues = data.map((d) => d.pv);

    const uvMean = mean(uvValues);
    const uvStdDev = stdDev(uvValues, uvMean);

    const pvMean = mean(pvValues);
    const pvStdDev = stdDev(pvValues, pvMean);

    return {
        uv: {
            zScorePlusOne: Number((uvMean + uvStdDev).toFixed(2)),
            zScoreMinusOne: Number((uvMean - uvStdDev).toFixed(2)),
        },
        pv: {
            zScorePlusOne: Number((pvMean + pvStdDev).toFixed(2)),
            zScoreMinusOne: Number((pvMean - pvStdDev).toFixed(2)),
        },
    };
};

// Get z-score thresholds
const z = calculateZScoreThresholds(data);

// Calculate gradient stop offsets
const getGradientOffsets = (data: Point[], dataKey: DataKeys, zThresholds: ZScoreThresholds) => {
    const values = data.map((d) => d[dataKey]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1; // Avoid division by zero

    const { zScoreMinusOne, zScorePlusOne } = zThresholds;

    // Calculate percentage offsets for z-score thresholds
    const percentageWhereZScorePlusOne = ((zScorePlusOne - minValue) / range) * 100;
    const percentageWhereZScoreMinusOne = ((zScoreMinusOne - minValue) / range) * 100;

    return {
        start: Math.min(percentageWhereZScoreMinusOne, percentageWhereZScorePlusOne),
        end: Math.max(percentageWhereZScoreMinusOne, percentageWhereZScorePlusOne),
    };
};

function App() {
    const pvOffsets = getGradientOffsets(data, 'pv', z.pv);
    const uvOffsets = getGradientOffsets(data, 'uv', z.uv);

    // Function to determine color based on X percentage position
    const getColorByXPosition = (index: number, offsets: GradientOffsets, baseColor: string) => {
        const xPercentage = (index / (data.length - 1)) * 100; // Percentage along X-axis
        return xPercentage >= offsets.start && xPercentage <= offsets.end ? 'red' : baseColor;
    };

    return (
        <div className={s.root}>
            <div className={s.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <defs>
                            <linearGradient id="gradientPV" x1="0" y1="0" x2="100%" y2="0">
                                <stop offset="0%" stopColor="#8884d8" />
                                <stop offset={`${pvOffsets.start - 0.01}%`} stopColor="#8884d8" />
                                <stop offset={`${pvOffsets.start}%`} stopColor="red" />
                                <stop offset={`${pvOffsets.end}%`} stopColor="red" />
                                <stop offset={`${pvOffsets.end + 0.01}%`} stopColor="#8884d8" />
                                <stop offset="100%" stopColor="#8884d8" />
                            </linearGradient>
                            <linearGradient id="gradientUV" x1="0" y1="0" x2="100%" y2="0">
                                <stop offset="0%" stopColor="#82ca9d" />
                                <stop offset={`${uvOffsets.start - 0.01}%`} stopColor="#82ca9d" />
                                <stop offset={`${uvOffsets.start}%`} stopColor="red" />
                                <stop offset={`${uvOffsets.end}%`} stopColor="red" />
                                <stop offset={`${uvOffsets.end + 0.01}%`} stopColor="#82ca9d" />
                                <stop offset="100%" stopColor="#82ca9d" />
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
                                const color = getColorByXPosition(index, pvOffsets, '#8884d8');
                                return <circle key={`pv-active-${index}`} cx={cx} cy={cy} r={8} fill={color} />;
                            }}
                            dot={({ cx, cy, index }: DotProps) => {
                                const color = getColorByXPosition(index, pvOffsets, '#8884d8');
                                return <circle key={`pv-dot-${index}`} cx={cx} cy={cy} r={4} fill={color} />;
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="uv"
                            stroke="url(#gradientUV)"
                            activeDot={(props: unknown) => {
                                const { cx, cy, index } = props as DotProps
                                const color = getColorByXPosition(index, uvOffsets, '#82ca9d');
                                return <circle key={`uv-active-${index}`} cx={cx} cy={cy} r={8} fill={color} />;
                            }}
                            dot={({ cx, cy, index }: DotProps) => {
                                const color = getColorByXPosition(index, uvOffsets, '#82ca9d');
                                return <circle key={`uv-dot-${index}`} cx={cx} cy={cy} r={4} fill={color} />;
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default App;