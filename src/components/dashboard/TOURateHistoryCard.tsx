import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOUData } from "@/types/user";
import { Info } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function TOURateHistoryCard({
  touHistory = [],
}: {
  touHistory: TOUData[];
}) {
  const lastTou = touHistory[touHistory.length - 1];
  const averageRate =
    touHistory.reduce((sum, item) => sum + item.rate, 0) / touHistory.length;

  const getRateStatus = (rate: number) => {
    if (rate < 5) return { label: "Low", color: "bg-green-500" };
    if (rate < 10) return { label: "Moderate", color: "bg-yellow-500" };
    return { label: "High", color: "bg-red-500" };
  };

  const getRecommendation = (rate: number) => {
    if (rate < 5) {
      return {
        title: "Low TOU Rates",
        description:
          "Consider switching to Grid energy if you haven't already.",
        detail: `${(((5 - rate) / 5) * 100).toFixed(1)}% lower than usual`,
        variant: "default" as "default",
      };
    }
    if (rate < 10) {
      return {
        title: "Moderate TOU Rates",
        description: "Current rates are within normal range",
        detail: `Rates between ₹5.00 and ₹10.00 are typical`,
        variant: "default" as "default",
      };
    }
    return {
      title: "High TOU Rates",
      description: "Consider switching to Solar energy if available",
      detail: `${(((rate - 10) / 5) * 100).toFixed(1)}% higher than usual`,
      variant: "destructive" as "destructive",
    };
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active: boolean;
    payload: any;
    label: string;
  }) => {
    if (active && payload && payload.length) {
      const rate = payload[0].value;
      const status = getRateStatus(rate);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium">
            {new Date(label).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${status.color}`} />
            <p className="text-sm">
              ₹{rate.toFixed(2)}/kWh - {status.label}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!lastTou) return null;

  const recommendation = getRecommendation(lastTou.rate);
  const status = getRateStatus(lastTou.rate);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">
            TOU Rate History
          </CardTitle>
          <Badge
            variant="outline"
            className={`${status.color} bg-opacity-10 text-black`}
          >
            Current: ₹{lastTou.rate.toFixed(2)}/kWh
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>Last 24 hours</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Avg: ₹{averageRate.toFixed(2)}/kWh
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={touHistory}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) =>
                  new Date(timestamp).toLocaleTimeString()
                }
                label={{ value: "Time", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                label={{
                  value: "Rate (₹/kWh)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 15,
                }}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={<CustomTooltip active={false} payload={[]} label="" />}
              />
              <ReferenceLine
                y={averageRate}
                stroke="#666"
                strokeDasharray="3 3"
              />
              <Line
                type="stepAfter"
                dataKey="rate"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Alert variant={recommendation.variant}>
          <div className="flex gap-2">
            <Info className="h-4 w-4 mt-1" />
            <div>
              <AlertTitle className="font-bold">
                {recommendation.title}
              </AlertTitle>
              <AlertDescription>
                <p>{recommendation.description}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {recommendation.detail}
                </p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
}
