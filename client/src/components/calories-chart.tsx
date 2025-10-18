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

export function CaloriesChart() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: foodLogs, isLoading } = useQuery({
    queryKey: ["/api/food-logs"],
    queryFn: async () => {
      const response = await fetch("/api/food-logs?limit=365", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch food logs");
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

  if (!foodLogs || foodLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
        <i className="fas fa-chart-line text-4xl mb-4"></i>
        <h3 className="text-lg font-semibold mb-2">No calorie data yet</h3>
        <p className="text-sm text-center">
          Start logging your meals to see your calorie trends
        </p>
      </div>
    );
  }

  // Group by date and sum calories
  const dailyCalories = foodLogs
    .filter((log: any) => log && log.consumedAt) // Filter out logs without consumedAt
    .reduce((acc: any, log: any) => {
      const date = format(parseISO(log.consumedAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0, fullDate: log.consumedAt };
      }
      acc[date].calories += log.calories || 0;
      acc[date].protein += log.protein || 0;
      acc[date].carbs += log.carbs || 0;
      acc[date].fat += log.fat || 0;
      return acc;
    }, {});

  // Filter and prepare chart data
  const chartData = Object.values(dailyCalories)
    .filter((day: any) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const logDate = parseISO(day.date);
      return isWithinInterval(logDate, { start: dateRange.from, end: dateRange.to });
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((day: any) => ({
      date: format(parseISO(day.date), 'MMM d'),
      calories: Math.round(day.calories),
      protein: Math.round(day.protein),
      carbs: Math.round(day.carbs),
      fat: Math.round(day.fat),
      fullDate: day.date,
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
            Try selecting a different date range or log your meals
          </p>
        </div>
      </div>
    );
  }

  // Calculate averages
  const avgCalories = chartData.reduce((sum, d) => sum + d.calories, 0) / chartData.length;
  const avgProtein = chartData.reduce((sum, d) => sum + d.protein, 0) / chartData.length;
  const avgCarbs = chartData.reduce((sum, d) => sum + d.carbs, 0) / chartData.length;
  const avgFat = chartData.reduce((sum, d) => sum + d.fat, 0) / chartData.length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            {format(parseISO(data.fullDate), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-primary">
            Calories: <span className="font-bold">{data.calories}</span>
          </p>
          <p className="text-sm text-secondary">
            Protein: <span className="font-bold">{data.protein}g</span>
          </p>
          <p className="text-sm text-accent">
            Carbs: <span className="font-bold">{data.carbs}g</span>
          </p>
          <p className="text-sm text-destructive">
            Fat: <span className="font-bold">{data.fat}g</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4" data-testid="calories-chart">
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
          <h3 className="text-sm font-medium text-muted-foreground">Nutrition Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">Daily calorie and macro intake</p>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground">{chartData.length} days</p>
          <p className="text-xs text-muted-foreground">
            {chartData[0]?.date} - {chartData[chartData.length - 1]?.date}
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
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="calories"
              name="Calories"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              connectNulls={true}
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
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">
            {Math.round(avgCalories)}
          </div>
          <div className="text-xs text-muted-foreground">Avg Calories</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-secondary">
            {Math.round(avgProtein)}g
          </div>
          <div className="text-xs text-muted-foreground">Avg Protein</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent">
            {Math.round(avgCarbs)}g
          </div>
          <div className="text-xs text-muted-foreground">Avg Carbs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-destructive">
            {Math.round(avgFat)}g
          </div>
          <div className="text-xs text-muted-foreground">Avg Fat</div>
        </div>
      </div>
    </div>
  );
}
