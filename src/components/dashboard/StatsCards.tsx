// components/dashboard/StatsCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserData } from "@/types/user";
import { Battery, MapPinHouse, Sun, Zap } from "lucide-react";

interface StatsCardsProps {
  userData: UserData;
  totalSolarPower: number;
  currentBatteryPower: number;
  uniqueDays: number;
  locationName: string;
  weatherData: any;
}

const LocationWeatherDetails = ({ location }: { location: string }) => (
  <div className="flex absolute top-[-10px] right-[-10px] items-center text-sm justify-end text-muted-foreground hover:text-foreground">
    <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-2 shadow-md">
      <MapPinHouse />
      <p>{location}</p>
    </div>
  </div>
);

export default function StatsCards({
  userData,
  currentBatteryPower,
  totalSolarPower,
  uniqueDays,
  locationName,
}: StatsCardsProps) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Current Battery Power
          </CardTitle>
          <Zap className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl flex items-center justify-start">
            <p className="font-bold">{currentBatteryPower.toFixed(1)} kW</p>
            <p className="text-xs text-muted-foreground ml-2">
              {currentBatteryPower.toFixed(1) === userData.storageCapacity
                ? "(Full)"
                : ""}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalSolarPower.toFixed(2)} kW produced in the past {uniqueDays}{" "}
            days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Battery Status</CardTitle>
          <Battery className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {userData.hasBatteryStorage
              ? `${userData.storageCapacity} kW`
              : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {userData.hasBatteryStorage
              ? "Total Battery Capacity"
              : "No battery storage"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Solar System Capacity
          </CardTitle>
          <Sun className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {userData.hasSolarPanels ? `${userData.solarCapacity} kW` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            Capacity of Solar Panels
          </p>
        </CardContent>
      </Card>

      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{userData.monthlyBill}</div>
          <p className="text-xs text-muted-foreground">
            Average monthly electricity bill
          </p>
          <LocationWeatherDetails location={locationName} />
        </CardContent>
      </Card>
    </div>
  );
}
