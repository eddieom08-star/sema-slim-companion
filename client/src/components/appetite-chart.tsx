import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function AppetiteChart() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: hungerLogs, isLoading } = useQuery({
    queryKey: ["/api/hunger-logs"],
    queryFn: async () => {
      const response = await fetch("/api/hunger-logs?limit=365", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch hunger logs");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!hungerLogs || hungerLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
        <i className="fas fa-chart-line text-4xl mb-4"></i>
        <h3 className="text-lg font-semibold mb-2">No appetite data yet</h3>
        <p className="text-sm text-center">
          Start logging your hunger levels to see trends
        </p>
      </div>
    );
  }

  // Filter and prepare chart data
  const chartData = hungerLogs
    .slice()
    .filter((log: any) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const logDate = parseISO(log.loggedAt);
      return isWithinInterval(logDate, { start: dateRange.from, end: dateRange.to });
    })
    .reverse()
    .map((log: any) => ({
      date: format(parseISO(log.loggedAt), 'MMM d'),
      // Use null instead of undefined for connectNulls to work properly
      hungerLevel: log.hungerLevel ?? null,
      fullnessLevel: log.fullnessLevel ?? null,
      cravingIntensity: log.cravingIntensity ?? null,
      fullDate: log.loggedAt,
    }));

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
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
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
          <i className="fas fa-chart-line text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No data for selected period</h3>
          <p className="text-sm text-center">
            Try selecting a different date range or log your appetite
          </p>
        </div>
      </div>
    );
  }

  // Calculate average hunger level
  const avgHunger = chartData.reduce((sum, d) => sum + (d.hungerLevel || 0), 0) / chartData.length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            {format(parseISO(data.fullDate), 'MMM d, yyyy')}
          </p>
          {data.hungerLevel && (
            <p className="text-sm text-primary">
              Hunger: <span className="font-bold">{data.hungerLevel}/10</span>
            </p>
          )}
          {data.fullnessLevel && (
            <p className="text-sm text-secondary">
              Fullness: <span className="font-bold">{data.fullnessLevel}/10</span>
            </p>
          )}
          {data.cravingIntensity && (
            <p className="text-sm text-accent">
              Cravings: <span className="font-bold">{data.cravingIntensity}/10</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4" data-testid="hunger-chart">
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
        </div>
      </div>

      {/* Chart Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Appetite Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">Track how your hunger levels change over time</p>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground">{chartData.length} entries</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(chartData[0].fullDate), 'MMM d')} - {format(parseISO(chartData[chartData.length - 1].fullDate), 'MMM d')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
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
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="hungerLevel"
              name="Hunger Level"
              stroke="#3b82f6"
              strokeWidth={3}
              connectNulls={true}
              isAnimationActive={false}
              dot={{
                fill: '#3b82f6',
                strokeWidth: 2,
                stroke: '#f8fafc',
                r: 5
              }}
              activeDot={{
                r: 7,
                fill: '#3b82f6',
                stroke: '#f8fafc',
                strokeWidth: 2
              }}
            />
            <Line
              type="monotone"
              dataKey="fullnessLevel"
              name="Fullness Level"
              stroke="#16a34a"
              strokeWidth={3}
              connectNulls={true}
              isAnimationActive={false}
              dot={{
                fill: '#16a34a',
                strokeWidth: 2,
                stroke: '#f8fafc',
                r: 5
              }}
              activeDot={{
                r: 7,
                fill: '#16a34a',
                stroke: '#f8fafc',
                strokeWidth: 2
              }}
            />
            <Line
              type="monotone"
              dataKey="cravingIntensity"
              name="Craving Intensity"
              stroke="#8b5cf6"
              strokeWidth={3}
              strokeDasharray="5 5"
              connectNulls={true}
              isAnimationActive={false}
              dot={{
                fill: '#8b5cf6',
                strokeWidth: 2,
                stroke: '#f8fafc',
                r: 5
              }}
              activeDot={{
                r: 7,
                fill: '#8b5cf6',
                stroke: '#f8fafc',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">
            {avgHunger.toFixed(1)}/10
          </div>
          <div className="text-xs text-muted-foreground">Average Hunger</div>
        </div>
      </div>
    </div>
  );
}
