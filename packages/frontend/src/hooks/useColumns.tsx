import {
    convertAdditionalMetric,
    fieldId as getFieldId,
    friendlyName,
    getFields,
    isDimension,
    Metric,
    SortField,
} from '@lightdash/common';
import React, { FC, useMemo } from 'react';
import { Column } from 'react-table';
import { useExplorer } from '../providers/ExplorerProvider';
import { useExplore } from './useExplore';

const getSortByProps = (
    fieldId: string,
    sortFields: SortField[],
    toggleSortField: (fieldId: string) => void,
    setSortFields: (sortFields: SortField[]) => void,
) => {
    const sortedIndex = sortFields.findIndex((sf) => fieldId === sf.fieldId);
    const isFieldSorted = sortedIndex !== -1;
    const getSortByToggleProps = () => ({
        style: {
            cursor: 'pointer',
        },
        title: 'Toggle SortBy',
        onClick: (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey || isFieldSorted) {
                toggleSortField(fieldId);
            } else {
                setSortFields([
                    {
                        fieldId,
                        descending: isFieldSorted
                            ? !sortFields[sortedIndex].descending
                            : false,
                    },
                ]);
            }
        },
    });

    return {
        getSortByToggleProps,
        sortedIndex,
        isSorted: isFieldSorted,
        isSortedDesc: isFieldSorted
            ? sortFields[sortedIndex].descending
            : undefined,
        isMultiSort: sortFields.length > 1,
    };
};

const FormatCell: FC<{ value: any }> = ({ value }) => value || '-';

export const useColumns = (): Column<{ [col: string]: any }>[] => {
    const {
        state: {
            activeFields,
            unsavedChartVersion: {
                tableName,
                metricQuery: {
                    sorts: sortFields,
                    tableCalculations,
                    additionalMetrics,
                },
            },
        },
        actions: { toggleSortField, setSortFields },
    } = useExplorer();
    const { data } = useExplore(tableName);
    return useMemo(() => {
        if (data) {
            const fieldColumns = [
                ...getFields(data),
                ...(additionalMetrics || []).reduce<Metric[]>(
                    (acc, additionalMetric) => {
                        const table = data.tables[additionalMetric.table];
                        if (table) {
                            const metric = convertAdditionalMetric({
                                additionalMetric,
                                table,
                            });
                            return [...acc, metric];
                        }
                        return acc;
                    },
                    [],
                ),
            ].reduce<Column<{ [col: string]: any }>[]>((acc, field) => {
                const fieldId = getFieldId(field);
                if (activeFields.has(fieldId)) {
                    return [
                        ...acc,
                        {
                            Header: (
                                <span>
                                    {field.tableLabel} <b>{field.label}</b>
                                </span>
                            ),
                            description:
                                field.description ||
                                `${field.tableLabel} ${field.label}`,
                            accessor: fieldId,
                            type: isDimension(field) ? 'dimension' : 'metric',
                            dimensionType: isDimension(field)
                                ? field.type
                                : undefined,
                            ...getSortByProps(
                                fieldId,
                                sortFields,
                                toggleSortField,
                                setSortFields,
                            ),
                            field,
                            Cell: FormatCell,
                        },
                    ];
                }
                return [...acc];
            }, []);
            const tableCalculationColumns = tableCalculations.reduce<
                Column<{ [col: string]: any }>[]
            >((acc, tableCalculation) => {
                const fieldId = tableCalculation.name;
                if (activeFields.has(fieldId)) {
                    return [
                        ...acc,
                        {
                            Header: (
                                <b>{friendlyName(tableCalculation.name)}</b>
                            ),
                            description: friendlyName(tableCalculation.name),
                            accessor: fieldId,
                            type: 'table_calculation',
                            tableCalculation,
                            ...getSortByProps(
                                fieldId,
                                sortFields,
                                toggleSortField,
                                setSortFields,
                            ),
                            Cell: FormatCell,
                        },
                    ];
                }
                return [...acc];
            }, []);

            return [...fieldColumns, ...tableCalculationColumns];
        }
        return [];
    }, [
        data,
        additionalMetrics,
        tableCalculations,
        activeFields,
        sortFields,
        toggleSortField,
        setSortFields,
    ]);
};
