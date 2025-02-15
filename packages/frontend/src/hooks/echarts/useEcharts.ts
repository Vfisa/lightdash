import {
    ApiQueryResults,
    CartesianChart,
    CartesianSeriesType,
    CompiledField,
    convertAdditionalMetric,
    DimensionType,
    ECHARTS_DEFAULT_COLORS,
    Field,
    findItem,
    formatItemValue,
    formatValue,
    friendlyName,
    getAxisName,
    getFieldLabel,
    getFieldMap,
    getFields,
    getItemId,
    getItemLabel,
    hashFieldReference,
    isField,
    Metric,
    MetricType,
    Series,
    TableCalculation,
} from '@lightdash/common';
import { useMemo } from 'react';
import { useVisualizationContext } from '../../components/LightdashVisualization/VisualizationProvider';
import { useOrganisation } from '../organisation/useOrganisation';

const getLabelFromField = (
    fields: Array<Field | TableCalculation>,
    key: string | undefined,
) => {
    const item = findItem(fields, key);
    if (item) {
        return isField(item) ? getFieldLabel(item) : item.displayName;
    } else if (key) {
        return friendlyName(key);
    } else {
        return '';
    }
};

const getAxisTypeFromField = (item?: Field): string => {
    if (item) {
        switch (item.type) {
            case DimensionType.NUMBER:
            case MetricType.NUMBER:
            case MetricType.AVERAGE:
            case MetricType.COUNT:
            case MetricType.COUNT_DISTINCT:
            case MetricType.SUM:
            case MetricType.MIN:
            case MetricType.MAX:
                return 'value';
            case DimensionType.TIMESTAMP:
            case DimensionType.DATE:
            case MetricType.DATE:
                return 'time';
            default: {
                return 'category';
            }
        }
    } else {
        return 'value';
    }
};

export const getAxisDefaultMinValue = ({
    min,
    max,
}: {
    min: any;
    max: any;
}) => {
    if (
        isNaN(parseInt(min)) ||
        isNaN(parseInt(max)) ||
        min instanceof Date ||
        max instanceof Date
    ) {
        return undefined;
    } else if (min >= 0 && min > (max - min) * 3) {
        return min;
    }
    return undefined;
};

export const getAxisDefaultMaxValue = ({
    min,
    max,
}: {
    min: any;
    max: any;
}) => {
    if (
        isNaN(parseInt(min)) ||
        isNaN(parseInt(max)) ||
        min instanceof Date ||
        max instanceof Date
    ) {
        return undefined;
    } else if (max < 0 && Math.abs(max) > Math.abs(min - max) * 3) {
        return max;
    }
    return undefined;
};

export type EChartSeries = {
    type: Series['type'];
    connectNulls: boolean;
    stack?: string;
    name?: string;
    color?: string;
    yAxisIndex?: number;
    xAxisIndex?: number;
    encode: {
        x: string;
        y: string;
        tooltip: string[];
        seriesName: string;
    };
    dimensions: Array<{ name: string; displayName: string }>;
    emphasis?: {
        focus?: string;
    };
};

const getFormattedValue = (
    value: any,
    key: string,
    items: Array<Field | TableCalculation>,
): string => {
    return formatItemValue(
        items.find((item) => getItemId(item) === key),
        value,
    );
};

const valueFormatter =
    (yFieldId: string, items: Array<Field | TableCalculation>) =>
    (rawValue: any) => {
        return getFormattedValue(rawValue, yFieldId, items);
    };

export const getEchartsSeries = (
    items: Array<Field | TableCalculation>,
    originalData: ApiQueryResults['rows'],
    cartesianChart: CartesianChart,
    pivotKey: string | undefined,
    formats:
        | Record<string, Pick<CompiledField, 'format' | 'round'>>
        | undefined,
): EChartSeries[] => {
    if (pivotKey) {
        return (cartesianChart.eChartsConfig.series || [])
            .filter((s) => !s.hidden)
            .map<EChartSeries>((series) => {
                const { flipAxes } = cartesianChart.layout;
                const xFieldHash = hashFieldReference(series.encode.xRef);
                const yFieldHash = hashFieldReference(series.encode.yRef);
                const pivotField = series.encode.yRef.pivotValues?.find(
                    ({ field }) => field === pivotKey,
                );

                const value = getFormattedValue(
                    pivotField?.value,
                    pivotKey,
                    items,
                );

                return {
                    ...series,
                    emphasis: {
                        focus: 'series',
                    },
                    xAxisIndex: flipAxes ? series.yAxisIndex : undefined,
                    yAxisIndex: flipAxes ? undefined : series.yAxisIndex,
                    connectNulls: true,
                    encode: {
                        x: flipAxes ? yFieldHash : xFieldHash,
                        y: flipAxes ? xFieldHash : yFieldHash,
                        tooltip: [yFieldHash],
                        seriesName: yFieldHash,
                    },
                    dimensions: [
                        {
                            name: xFieldHash,
                            displayName: getLabelFromField(items, xFieldHash),
                        },
                        {
                            name: yFieldHash,
                            displayName:
                                cartesianChart.layout.yField &&
                                cartesianChart.layout.yField.length > 1
                                    ? `[${value}] ${getLabelFromField(
                                          items,
                                          series.encode.yRef.field,
                                      )}`
                                    : value,
                        },
                    ],
                    tooltip: {
                        valueFormatter: valueFormatter(
                            series.encode.yRef.field,
                            items,
                        ),
                    },
                    ...(series.label?.show &&
                        formats &&
                        formats[series.encode.yRef.field] && {
                            label: {
                                ...series.label,
                                formatter: (val: any) =>
                                    formatValue(
                                        formats[series.encode.yRef.field]
                                            .format,
                                        formats[series.encode.yRef.field].round,
                                        val?.value?.[yFieldHash],
                                    ),
                            },
                        }),
                };
            });
    } else {
        return (cartesianChart.eChartsConfig.series || []).reduce<
            EChartSeries[]
        >((sum, series) => {
            const { flipAxes } = cartesianChart.layout;
            const xField = hashFieldReference(series.encode.xRef);
            const yField = hashFieldReference(series.encode.yRef);
            return [
                ...sum,
                {
                    ...series,
                    xAxisIndex: flipAxes ? series.yAxisIndex : undefined,
                    yAxisIndex: flipAxes ? undefined : series.yAxisIndex,
                    emphasis: {
                        focus: 'series',
                    },
                    connectNulls: true,
                    encode: {
                        ...series.encode,
                        x: flipAxes ? yField : xField,
                        y: flipAxes ? xField : yField,
                        tooltip: [yField],
                        seriesName: yField,
                    },
                    dimensions: [
                        {
                            name: xField,
                            displayName: getLabelFromField(items, xField),
                        },
                        {
                            name: yField,
                            displayName: getLabelFromField(items, yField),
                        },
                    ],
                    tooltip: {
                        valueFormatter: valueFormatter(yField, items),
                    },

                    ...(series.label?.show &&
                        formats &&
                        formats[yField] && {
                            label: {
                                ...series.label,
                                formatter: (value: any) =>
                                    formatValue(
                                        formats[yField].format,
                                        formats[yField].round,
                                        value?.value?.[yField],
                                    ),
                            },
                        }),
                },
            ];
        }, []);
    }
};

const getEchartAxis = ({
    items,
    validCartesianConfig,
    series,
    formats,
}: {
    validCartesianConfig: CartesianChart;
    items: Array<Field | TableCalculation>;
    series: EChartSeries[];
    formats:
        | Record<string, Pick<CompiledField, 'round' | 'format'>>
        | undefined;
}) => {
    const itemMap = items.reduce<Record<string, Field | TableCalculation>>(
        (acc, item) => ({
            ...acc,
            [getItemId(item)]: item,
        }),
        {},
    );
    const xAxisItemId = validCartesianConfig.layout.flipAxes
        ? validCartesianConfig.layout?.yField?.[0]
        : validCartesianConfig.layout?.xField;
    const xAxisItem = xAxisItemId ? itemMap[xAxisItemId] : undefined;

    const yAxisItemId = validCartesianConfig.layout.flipAxes
        ? validCartesianConfig.layout?.xField
        : validCartesianConfig.layout?.yField?.[0];
    const yAxisItem = yAxisItemId ? itemMap[yAxisItemId] : undefined;

    const defaultXAxisType = getAxisTypeFromField(
        isField(xAxisItem) ? xAxisItem : undefined,
    );
    const defaultYAxisType = getAxisTypeFromField(
        isField(yAxisItem) ? yAxisItem : undefined,
    );

    let xAxisType;
    let yAxisType;

    if (validCartesianConfig.layout.flipAxes) {
        xAxisType = defaultXAxisType;
        yAxisType =
            defaultYAxisType === 'value' ? 'category' : defaultYAxisType;
    } else {
        xAxisType =
            defaultXAxisType === 'value' ? 'category' : defaultXAxisType;
        yAxisType = defaultYAxisType;
    }

    const selectedAxisInSeries = Array.from(
        new Set(
            series?.map(({ yAxisIndex, xAxisIndex }) =>
                validCartesianConfig.layout.flipAxes ? xAxisIndex : yAxisIndex,
            ),
        ),
    );
    const isAxisTheSameForAllSeries: boolean =
        selectedAxisInSeries.length === 1;
    const selectedAxisIndex = selectedAxisInSeries[0] || 0;

    const xAxisConfiguration = validCartesianConfig.layout.flipAxes
        ? validCartesianConfig.eChartsConfig?.yAxis
        : validCartesianConfig.eChartsConfig?.xAxis;
    const yAxisConfiguration = validCartesianConfig.layout.flipAxes
        ? validCartesianConfig.eChartsConfig?.xAxis
        : validCartesianConfig.eChartsConfig?.yAxis;

    const [allowFirstAxisDefaultRange, allowSecondAxisDefaultRange] = (
        series || []
    ).reduce<[boolean, boolean]>(
        (acc, singleSeries) => {
            if (singleSeries.type === CartesianSeriesType.BAR) {
                acc[singleSeries.yAxisIndex || 0] = false;
            }
            return acc;
        },
        [true, true],
    );

    const getAxisFormatter = (
        axisItem: Field | TableCalculation | undefined,
    ) => {
        const field =
            axisItem && getItemId(axisItem) && formats?.[getItemId(axisItem)];
        return (
            field &&
            (field.format || field.round) && {
                axisLabel: {
                    formatter: (value: any) => {
                        return formatValue(field.format, field.round, value);
                    },
                },
            }
        );
    };

    return {
        xAxis: [
            {
                type: xAxisType,
                name: validCartesianConfig.layout.flipAxes
                    ? getAxisName({
                          isAxisTheSameForAllSeries,
                          selectedAxisIndex,
                          axisIndex: 0,
                          axisReference: 'yRef',
                          axisName: xAxisConfiguration?.[0]?.name,
                          items,
                          series: validCartesianConfig.eChartsConfig.series,
                      })
                    : xAxisConfiguration?.[0]?.name ||
                      (xAxisItem ? getItemLabel(xAxisItem) : undefined),
                min: validCartesianConfig.layout.flipAxes
                    ? xAxisConfiguration?.[0]?.min || allowFirstAxisDefaultRange
                        ? getAxisDefaultMinValue
                        : undefined
                    : undefined,
                max: validCartesianConfig.layout.flipAxes
                    ? xAxisConfiguration?.[0]?.max || allowFirstAxisDefaultRange
                        ? getAxisDefaultMaxValue
                        : undefined
                    : undefined,
                nameLocation: 'center',
                nameGap: 30,
                nameTextStyle: {
                    fontWeight: 'bold',
                },
                ...getAxisFormatter(xAxisItem),
            },
            {
                type: xAxisType,
                name: validCartesianConfig.layout.flipAxes
                    ? getAxisName({
                          isAxisTheSameForAllSeries,
                          selectedAxisIndex,
                          axisIndex: 1,
                          axisReference: 'yRef',
                          axisName: xAxisConfiguration?.[1]?.name,
                          items,
                          series: validCartesianConfig.eChartsConfig.series,
                      })
                    : undefined,
                min: validCartesianConfig.layout.flipAxes
                    ? xAxisConfiguration?.[1]?.min ||
                      allowSecondAxisDefaultRange
                        ? getAxisDefaultMinValue
                        : undefined
                    : undefined,
                max: validCartesianConfig.layout.flipAxes
                    ? xAxisConfiguration?.[1]?.max ||
                      allowSecondAxisDefaultRange
                        ? getAxisDefaultMaxValue
                        : undefined
                    : undefined,
                nameLocation: 'center',
                nameGap: 30,
                nameTextStyle: {
                    fontWeight: 'bold',
                },
                splitLine: {
                    show: isAxisTheSameForAllSeries,
                },
            },
        ],
        yAxis: [
            {
                type: yAxisType,
                name: validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[0]?.name ||
                      (yAxisItem ? getItemLabel(yAxisItem) : undefined)
                    : getAxisName({
                          isAxisTheSameForAllSeries,
                          selectedAxisIndex,
                          axisIndex: 0,
                          axisReference: 'yRef',
                          axisName: yAxisConfiguration?.[0]?.name,
                          items,
                          series: validCartesianConfig.eChartsConfig.series,
                      }),
                min: !validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[0]?.min || allowFirstAxisDefaultRange
                        ? getAxisDefaultMinValue
                        : undefined
                    : undefined,
                max: !validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[0]?.max || allowFirstAxisDefaultRange
                        ? getAxisDefaultMaxValue
                        : undefined
                    : undefined,
                nameTextStyle: {
                    fontWeight: 'bold',
                    align: 'left',
                },
                nameLocation: 'end',
                nameGap: 30,
                ...getAxisFormatter(yAxisItem),
            },
            {
                type: yAxisType,
                name: validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[1]?.name
                    : getAxisName({
                          isAxisTheSameForAllSeries,
                          selectedAxisIndex,
                          axisIndex: 1,
                          axisReference: 'yRef',
                          axisName: yAxisConfiguration?.[1]?.name,
                          items,
                          series: validCartesianConfig.eChartsConfig.series,
                      }),
                min: !validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[1]?.min ||
                      allowSecondAxisDefaultRange
                        ? getAxisDefaultMinValue
                        : undefined
                    : undefined,
                max: !validCartesianConfig.layout.flipAxes
                    ? yAxisConfiguration?.[1]?.max ||
                      allowSecondAxisDefaultRange
                        ? getAxisDefaultMaxValue
                        : undefined
                    : undefined,
                nameTextStyle: {
                    fontWeight: 'bold',
                    align: 'right',
                },
                nameLocation: 'end',
                nameGap: 30,
                splitLine: {
                    show: isAxisTheSameForAllSeries,
                },
            },
        ],
    };
};

const useEcharts = () => {
    const {
        cartesianConfig: { validCartesianConfig },
        explore,
        plotData,
        originalData,
        pivotDimensions,
        resultsData,
    } = useVisualizationContext();

    const formats = explore
        ? getFieldMap(explore, resultsData?.metricQuery.additionalMetrics)
        : undefined;
    const { data: organisationData } = useOrganisation();

    const items = useMemo(() => {
        if (!explore || !resultsData) {
            return [];
        }
        return [
            ...getFields(explore),
            ...(resultsData?.metricQuery.additionalMetrics || []).reduce<
                Metric[]
            >((acc, additionalMetric) => {
                const table = explore.tables[additionalMetric.table];
                if (table) {
                    const metric = convertAdditionalMetric({
                        additionalMetric,
                        table,
                    });
                    return [...acc, metric];
                }
                return acc;
            }, []),
            ...(resultsData?.metricQuery.tableCalculations || []),
        ];
    }, [explore, resultsData]);

    const series = useMemo(() => {
        if (!explore || !validCartesianConfig || !resultsData) {
            return [];
        }

        return getEchartsSeries(
            items,
            originalData,
            validCartesianConfig,
            pivotDimensions?.[0],
            formats,
        );
    }, [
        explore,
        validCartesianConfig,
        resultsData,
        pivotDimensions,
        originalData,
        formats,
        items,
    ]);

    const axis = useMemo(() => {
        if (!validCartesianConfig) {
            return { xAxis: [], yAxis: [] };
        }

        return getEchartAxis({ items, series, validCartesianConfig, formats });
    }, [items, series, validCartesianConfig, formats]);

    if (
        !explore ||
        series.length <= 0 ||
        plotData.length <= 0 ||
        !validCartesianConfig
    ) {
        return undefined;
    }

    return {
        xAxis: axis.xAxis,
        yAxis: axis.yAxis,
        useUTC: true,
        series,
        legend: {
            show: series.length > 1,
        },
        dataset: {
            id: 'lightdashResults',
            source: plotData,
        },
        tooltip: {
            show: true,
            confine: true,
            trigger: 'axis',
            axisPointer: {
                type: 'shadow',
                label: { show: true },
            },
        },
        grid: {
            containLabel: true,
            left: '5%', // small padding
            right: '5%', // small padding
            top: 70, // pixels from top (makes room for legend)
            bottom: 30, // pixels from bottom (makes room for x-axis)
        },
        color: organisationData?.chartColors || ECHARTS_DEFAULT_COLORS,
    };
};

export default useEcharts;
