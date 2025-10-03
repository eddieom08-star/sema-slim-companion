import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain } from "lucide-react";

export function HungerChart() {
  const { data: hungerLogs, isLoading } = useQuery({
    queryKey: ["/api/hunger-logs"],
    queryFn: async () => {
      const response = await fetch("/api/hunger-logs?limit=30", {
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hungerLogs || hungerLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Brain className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No appetite data yet</h3>
        <p className="text-sm text-center">
          Start logging your hunger and fullness levels to see your trends
        </p>
      </div>
    );
  }

  const chartData = hungerLogs
    .slice()
    .reverse()
    .map((log: any) => ({
      date: format(parseISO(log.loggedAt), 'MMM d'),
      hunger: log.hungerBefore,
      fullness: log.hungerAfter ? 11 - log.hungerAfter : null,
      craving: log.cravingIntensity,
      fullDate: log.loggedAt,
    }));

  const avgHunger = chartData.reduce((sum: number, d: any) => sum + (d.hunger || 0), 0) / chartData.length;
  const avgFullness = chartData
    .filter((d: any) => d.fullness !== null)
    .reduce((sum: number, d: any) => sum + (d.fullness || 0), 0) / chartData.filter((d: any) => d.fullness !== null).length || 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            {format(parseISO(data.fullDate), 'MMM d, yyyy')}
          </p>
          {data.hunger && (
            <p className="text-sm text-primary">
              Hunger: <span className="font-bold">{data.hunger}/10</span>
            </p>
          )}
          {data.fullness !== null && data.fullness !== undefined && (
            <p className="text-sm text-secondary">
              Fullness: <span className="font-bold">{data.fullness}/10</span>
            </p>
          )}
          {data.craving && (
            <p className="text-sm text-accent">
              Craving: <span className="font-bold">{data.craving}/10</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4" data-testid="hunger-chart">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Appetite Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Track how your hunger levels change over time
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{chartData.length} entries</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(chartData[0].fullDate), 'MMM d')} - {format(parseISO(chartData[chartData.length - 1].fullDate), 'MMM d')}
          </p>
        </div>
      </div>

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
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="hunger"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Hunger Level"
              dot={{ 
                fill: 'hsl(var(--primary))', 
                strokeWidth: 2, 
                stroke: 'hsl(var(--background))',
                r: 3 
              }}
              activeDot={{ 
                r: 5, 
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2
              }}
            />
            <Line
              type="monotone"
              dataKey="fullness"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              name="Fullness Level"
              connectNulls
              dot={{ 
                fill: 'hsl(var(--secondary))', 
                strokeWidth: 2, 
                stroke: 'hsl(var(--background))',
                r: 3 
              }}
              activeDot={{ 
                r: 5, 
                fill: 'hsl(var(--secondary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2
              }}
            />
            <Line
              type="monotone"
              dataKey="craving"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              name="Craving Intensity"
              strokeDasharray="5 5"
              connectNulls
              dot={{ 
                fill: 'hsl(var(--accent))', 
                strokeWidth: 2, 
                stroke: 'hsl(var(--background))',
                r: 3 
              }}
              activeDot={{ 
                r: 5, 
                fill: 'hsl(var(--accent))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">
            {avgHunger.toFixed(1)}/10
          </div>
          <div className="text-xs text-muted-foreground">Average Hunger</div>
        </div>
        {avgFullness > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-secondary">
              {avgFullness.toFixed(1)}/10
            </div>
            <div className="text-xs text-muted-foreground">Average Fullness</div>
          </div>
        )}
      </div>
    </div>
  );
}
