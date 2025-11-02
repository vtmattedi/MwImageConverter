import React from 'react';
import Chart, { type ChartData } from '../components/MainChart';
import { Card, CardHeader } from '@/components/ui/card';
import { useGlobals } from '@/Providers/Globals';
import { getDataPerDate, chartConfigPerDate, chartConfigPerArea, chartConfigTotal } from '@/assets/util/AttachedData';
// import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ListFilter, TrendingUp, CircleSlash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import InfoCard from '@/components/InfoCard';
import Filters, {
    type FilterType, availableAreas, availableFunctions, avilableAggragates, avilableTimes
} from '../components/Filter';
import PieCard from '@/components/PieCard';
import type { ChartConfig } from '@/components/ui/chart';

const Home: React.FC = () => {
    const { onMobile } = useGlobals();
    // Sync click from mainchart to pie chart
    const [periodSelected, setPeriodSelected] = React.useState<string | undefined>(undefined);
    const baseData = getDataPerDate();
    // Get the most recent date from the data
    const maxDate = new Date(Math.max(...baseData.map(o => new Date(o.date).getTime())));
    const [filters, setFilters] = React.useState<FilterType>({
        area: availableAreas,
        function: availableFunctions,
        timeFrame: 30,
        dataType: {
            type: 'by Function',
            time: 'Daily'
        }
    });
    const getFilteredData: () => ChartData[] = () => {
        const baseData = getDataPerDate();
        const data: any[] = [];
        baseData.forEach(item => {
            //First we filter by data in the selected time frame
            if (filters.timeFrame > -1 && new Date(item.date) < new Date(maxDate.getTime() - (filters.timeFrame * 24 * 60 * 60 * 1000))) {
                return null;
            }
            // Then we check if the we are agregating by hours, days, weeks, months
            let key = item.date;
            if (filters.dataType.time === 'Daily') {
                key = new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            }
            else if (filters.dataType.time === 'Weekly') {
                const firstDayOfWeek = new Date(item.date);
                firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
                key = firstDayOfWeek.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' }) + " - " + lastDayOfWeek.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
            }
            else if (filters.dataType.time === 'Monthly') {
                const date = new Date(item.date);
                key = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            }
            const newItem = {} as any;
            // Aggragate values based functions
            for (const value of item.values) {
                if (!filters.function.includes(value.function) || !filters.area.includes(value.area)) {
                    continue;
                }
                if (filters.dataType.type === 'by Function') {
                    newItem[value.function] = (newItem[value.function] || 0) + value.value;
                }
                else if (filters.dataType.type === 'by Area') {
                    const area_key = Object.entries(chartConfigPerArea).find(([_, v]) => v.label === value.area)?.[0] || value.area;
                    newItem[area_key] = (newItem[area_key] || 0) + value.value;
                }
                else if (filters.dataType.type === 'Total') {
                    newItem['Total'] = (newItem['Total'] || 0) + value.value;
                }
            }
            const existing = data.find(d => d.date === key);
            if (existing) {
                Object.entries(newItem).forEach(([key, value]) => {
                    existing[key] = (existing[key] || 0) + value;
                });
            } else {
                data.push({ date: key, ...newItem });
            }
        });
        return data.filter(item => item !== null);
    }
    const filterChartConfig: () => ChartConfig = () => {
        let _config = {} as ChartConfig;
        if (filters.dataType.type === 'by Area') {
            _config = Object.fromEntries(Object.entries(chartConfigPerArea).filter(([_, value]) => filters.area.includes(value.label)));
        }
        else if (filters.dataType.type === 'by Function') {
            _config = Object.fromEntries(Object.entries(chartConfigPerDate).filter(([key, _]) => filters.function.includes(key)));
        }
        else if (filters.dataType.type === 'Total') {
            _config = chartConfigTotal;
        }
        return _config;
    }
    const getFilteredAvg = (): number => {
        const filteredData = getFilteredData();
        if (filteredData.length === 0) return 0;

        return Math.round(filteredData.reduce((acc, item) => {
            let total = 0;
            Object.entries(item).forEach(([_, value]) => {
                //sum all values that are numbers i.e. filtred data keys skipping DATE
                if (value && typeof value === 'number') {
                    total += value;
                }
            });
            return acc + total;
        }, 0) / filteredData.length)
    }
    const getFilteredMax = (): { value: number, date: string } => {
        const filteredData = getFilteredData();
        const res = { value: 0, date: '' };
        filteredData.forEach(item => {
            let total = 0;
            Object.entries(item).forEach(([_, value]) => {
                //sum all values that are numbers i.e. filtred data keys skipping DATE
                if (value && typeof value === 'number') {
                    total += value;
                }
            });
            if (total > res.value) {
                res.value = total;
                res.date = item.date;
            }
        });
        return res;
    }
    const getDataTypeLabel = () => {
        const res = { type: '', time: '' };
        res.time = Object.entries(avilableTimes).find(([k, _]) => k === filters.dataType.time)?.[1] || res.time;
        res.type = Object.entries(avilableAggragates).find(([k, _]) => k === filters.dataType.type)?.[1] || res.type;
        return res
    }
    return (
        <>
            {/* Filter Bar */}
            <div className=' top-[64px] left-0 w-[100vw] h-32 flex flex-row h-[48px] bg-gray-300 dark:bg-[#111111] shadow-md justify-between items-center px-4 border-b'
                style={{
                    position: 'sticky',
                    zIndex: 999,
                }}>
                {
                    onMobile ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className='flex items-center w-full justify-center '>
                                    <Button variant="outline" className='border font-lato font-[400]  '>
                                        <ListFilter className="mr-2" />
                                        Filtros & Visualização
                                    </Button>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[90vw] ml-1 mt-1 dark:bg-[#111111]">
                                <Filters filters={filters} setFilters={setFilters} className='flex flex-col gap-4 w-full justify-between' />
                            </PopoverContent>
                        </Popover>
                    ) : <Filters filters={filters} setFilters={setFilters} className='flex w-full justify-between p-1'
                    />

                }
            </div>
            {/* Chart Section */}
            <div className='w-[100vw] max-h-[calc(100vh-64px-52px)] flex px-4 '
                style={{
                    flexDirection: onMobile ? 'column' : 'row',
                    justifyContent: onMobile ? 'flex-start' : 'center',
                    padding: onMobile ? '0' : undefined,
                    marginTop: '0.25rem',
                    marginLeft: onMobile ? 'auto' : undefined,
                    marginRight: onMobile ? 'auto' : undefined,
                    overflowY: 'auto',
                    width: onMobile ? '98vw' : undefined,
                }}
            >
                {/* Main Chart */}
                <div className='rounded-md  '
                    style={{
                        minWidth: onMobile ? undefined : '650px',
                    }}>
                    <Card className='h-full '
                        style={{
                            minHeight: onMobile ? undefined : '733px',
                        }}>
                        <CardHeader className='font-lato'>
                            <div className='flex flex-col p-0'>
                                <div className='font-lato text-3xl'>Quantidade de funcionarios {getDataTypeLabel().time.toLowerCase()}</div>
                                <div className='text-sm font-lato font-[300]'>
                                    Análise {filters.timeFrame === -1 ? 'de todos os dias' : 'dos últimos ' + filters.timeFrame + ' dias'} para {filters.function.length} funções em {filters.area.length} áreas.
                                </div>
                            </div>
                        </CardHeader>
                        <div style={{
                            maxWidth: onMobile ? '1000px' : undefined,
                            margin: '0 auto',
                        }} className='w-full'>
                            <Chart data={getFilteredData()} chartConfig={filterChartConfig()} periodChange={setPeriodSelected} />
                        </div>
                    </Card>
                </div>
                {/* Side Info - Pie Chart and Averages */}
                <div className='flex flex-col'
                    style={{
                        //prob want extra space at the bottom cuz modern phones have a bottom bar that covers content
                        marginBottom: onMobile ? '5rem' : '0',
                    }}
                >
                    {/* Averages and Peaks */}
                    <div className='flex flex-row '
                        style={{
                            marginLeft: onMobile ? '0' : '0.5rem',
                            marginTop: onMobile ? '0.5rem' : '0',
                            marginBottom: onMobile ? '0.5rem' : '0.5rem',
                            gap: onMobile ? '0.25rem' : '0.5rem',
                        }}>
                        <InfoCard
                            style={{
                                width: onMobile ? '50%' : undefined,
                            }}
                            cardTitle={<><CircleSlash2 /> Média</>}
                            number={getFilteredAvg()}
                            unit={`de funcionários ${getDataTypeLabel().time.toLowerCase()}`}
                            description={(filters.timeFrame === -1 ? 'Todos os dias' : 'Nos últimos ' + filters.timeFrame + ' dias') + "."}
                        />
                        <InfoCard
                            style={{
                                width: onMobile ? '50%' : undefined,
                            }}
                            cardTitle={<><TrendingUp /> Pico</>}
                            number={getFilteredMax().value}
                            unit={`de funcionários em um${['Weekly', 'Hourly'].includes(filters.dataType.time) ? 'a' : ''} ${filters.dataType.time == 'Daily' ? 'dia' : filters.dataType.time == 'Weekly' ? 'semana' : filters.dataType.time == 'Monthly' ? 'mês' : 'hora'}`}
                            description={(getFilteredMax().date ? "Registrado em " + getFilteredMax().date : "Sem dados") + "."}
                        />
                    </div >
                    {/* Pie Chart */}
                    <div className=' flex justify-center items-center'
                        style={{
                            marginLeft: onMobile ? '0' : '0.5rem'
                        }}
                    >

                        <PieCard
                            filters={filters}
                            periodSelected={periodSelected}
                            />
                    </div>
                </div>
            </div >

        </>
    );
};

export default Home;