import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ProgressChart() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: weightLogs, isLoading } = useQuery({
    queryKey: ["/api/weight-logs"],
    queryFn: async () => {
      const response = await fetch("/api/weight-logs?limit=365", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch weight logs");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <i className="fas fa-chart-line text-4xl mb-4"></i>
        <h3 className="text-lg font-semibold mb-2">No weight data yet</h3>
        <p className="text-sm text-center">
          Start logging your weight to see your progress chart
        </p>
      </div>
    );
  }

  // Filter and prepare chart data based on date range
  const chartData = weightLogs
    .slice()
    .filter((log: any) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const logDate = parseISO(log.loggedAt);
      return isWithinInterval(logDate, { start: dateRange.from, end: dateRange.to });
    })
    .reverse()
    .map((log: any) => ({
      date: format(parseISO(log.loggedAt), 'MMM d'),
      weight: Number(log.weight),
      fullDate: log.loggedAt,
    }));

  // Check if filtered data is empty
  if (chartData.length === 0) {
    return (
      <div className="space-y-4" data-testid="progress-chart">
        {/* Date Range Picker */}
        <div className="flex items-center justify-between">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Quick date range buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
            >
              7d
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
            >
              30d
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
            >
              90d
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 365), to: new Date() })}
            >
              1y
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <i className="fas fa-chart-line text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No data for selected period</h3>
          <p className="text-sm text-center">
            Try selecting a different date range or log your weight
          </p>
        </div>
      </div>
    );
  }

  // Calculate trend
  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const totalChange = lastWeight - firstWeight;
  const isLosingWeight = totalChange < 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {format(parseISO(data.fullDate), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-primary">
            Weight: <span className="font-bold">{data.weight.toFixed(1)} lbs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4" data-testid="progress-chart">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Quick date range buttons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
          >
            7d
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
          >
            30d
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
          >
            90d
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 365), to: new Date() })}
          >
            1y
          </Button>
        </div>
      </div>

      {/* Chart Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Weight Trend</h3>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-foreground">
              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} lbs
            </span>
            <span className={`text-sm ${isLosingWeight ? 'text-secondary' : 'text-destructive'}`}>
              {isLosingWeight ? (
                <>
                  <i className="fas fa-arrow-down mr-1"></i>
                  Lost
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-up mr-1"></i>
                  Gained
                </>
              )}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{chartData.length} entries</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(chartData[0].fullDate), 'MMM d')} - {format(parseISO(chartData[chartData.length - 1].fullDate), 'MMM d')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis 
              domain={['dataMin - 2', 'dataMax + 2']}
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ 
                fill: 'hsl(var(--primary))', 
                strokeWidth: 2, 
                stroke: 'hsl(var(--background))',
                r: 4 
              }}
              activeDot={{ 
                r: 6, 
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {firstWeight?.toFixed(1)} lbs
          </div>
          <div className="text-xs text-muted-foreground">Starting</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {lastWeight?.toFixed(1)} lbs
          </div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${isLosingWeight ? 'text-secondary' : 'text-destructive'}`}>
            {Math.abs(totalChange).toFixed(1)} lbs
          </div>
          <div className="text-xs text-muted-foreground">
            {isLosingWeight ? 'Lost' : 'Gained'}
          </div>
        </div>
      </div>
    </div>
  );
}
