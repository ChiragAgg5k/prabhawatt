import {
  ConsumptionAnalytics,
  Discom,
  EnergyData,
  ExecutiveSummary,
  SolarAnalysis,
  TariffAnalysis,
  TOUData,
  UserData,
  WeatherData,
} from "@/types/user";

function groupDataByDay(energyData: EnergyData[]): Map<string, EnergyData[]> {
  const dataByDay = new Map<string, EnergyData[]>();

  energyData.forEach((data) => {
    const date = new Date(data.SendDate).toLocaleDateString();
    if (!dataByDay.has(date)) {
      dataByDay.set(date, []);
    }
    dataByDay.get(date)?.push(data);
  });

  return dataByDay;
}

// Calculate executive summary without API call
async function calculateExecutiveSummary(
  energyData: EnergyData[],
  touData: TOUData[],
  userData: UserData,
  weatherData: WeatherData,
): Promise<ExecutiveSummary> {
  const dataByDay = groupDataByDay(energyData);
  const days = Array.from(dataByDay.keys()).sort();
  const latestDay = days[days.length - 1];
  const previousDay = days[days.length - 2];

  const currentDayData = dataByDay.get(latestDay) || [];
  const previousDayData = dataByDay.get(previousDay) || [];

  const averageRate =
    touData.reduce((sum, data) => sum + data.rate, 0) / touData.length;
  const calculateDayCost = (dayData: EnergyData[]) =>
    dayData.reduce((sum, data) => sum + data.Consumption * averageRate, 0);

  const currentDayCost = calculateDayCost(currentDayData);
  const previousDayCost = calculateDayCost(previousDayData);
  const costComparisonPercentage = previousDayCost
    ? ((currentDayCost - previousDayCost) / previousDayCost) * 100
    : 0;

  const solarGeneration = userData.hasSolarPanels
    ? currentDayData.reduce((sum, data) => sum + (data.SolarEnergy || 0), 0)
    : null;

  const totalEnergySavings = solarGeneration
    ? solarGeneration * averageRate
    : 0;

  // Get AI recommendations based on all available data
  const aiPrompt = `
    Analyze household energy metrics and provide actionable recommendations:

    CONSUMPTION METRICS:
    - Cost trend: ${costComparisonPercentage.toFixed(2)}% ${costComparisonPercentage > 0 ? "increase" : "decrease"}
    - Current day cost: ${currentDayCost.toFixed(2)}
    - Previous day cost: ${previousDayCost.toFixed(2)}

    ENERGY INFRASTRUCTURE:
    - Solar installed: ${userData.hasSolarPanels ? "Yes" : "No"}
    - Solar capacity: ${userData.hasSolarPanels ? userData.solarCapacity + " kW" : "N/A"}
    - Battery storage: ${userData.hasBatteryStorage ? userData.storageCapacity + " kWh" : "No"}
    - Monthly bill: ${userData.monthlyBill} Rs
    - Electricity provider: ${userData.electricityProvider}

    WEATHER CONDITIONS:
    - Temperature: ${weatherData.main.temp}°C
    - Humidity: ${weatherData.main.humidity}%
    - Weather: ${weatherData.weather[0].main}
    - Description: ${weatherData.weather[0].description}

    Based on this data, provide recommendations that:
    1. Address the most impactful cost-saving opportunities
    2. Consider existing infrastructure (solar/battery if present)
    3. Account for current weather conditions
    4. Can be implemented immediately
    5. Have measurable impact on energy costs

    Format the response as JSON with structure:
    {
      "recommendations": [
        {
          "text": "recommendation text",
          "priority": "high/medium/low",
          "estimatedImpact": "percentage or kWh value"
        }
      ]
    }
  `;

  const aiResponse = await fetchAIResponse(aiPrompt);

  const recommendations: {
    text: string;
    priority: "high" | "medium" | "low";
    estimatedImpact: string;
  }[] = aiResponse?.recommendations ? aiResponse.recommendations : [];

  return {
    currentMonthCost: parseFloat(currentDayCost.toFixed(2)),
    costComparisonPercentage: parseFloat(costComparisonPercentage.toFixed(2)),
    costTrend: costComparisonPercentage > 0 ? "up" : "down",
    totalEnergySavings: parseFloat(totalEnergySavings.toFixed(2)),
    solarGeneration: solarGeneration
      ? parseFloat(solarGeneration.toFixed(2))
      : null,
    batteryUsage: userData.hasBatteryStorage
      ? parseFloat(userData.storageCapacity)
      : null,
    keyRecommendations: recommendations,
  };
}

// Generate tariff analysis
async function generateTariffAnalysis(
  touData: TOUData[],
  discomData: Discom,
): Promise<TariffAnalysis> {
  const rates = touData.map((t) => t.rate);
  const averageRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const peakRate = Math.max(...rates);
  const offPeakRate = Math.min(...rates);

  const aiPrompt = `
    Analyze electricity tariffs and identify cost-saving opportunities:

    CURRENT TARIFF METRICS:
    - Average rate: ${averageRate.toFixed(2)} Rs/kWh
    - Peak rate: ${peakRate.toFixed(2)} Rs/kWh
    - Off-peak rate: ${offPeakRate.toFixed(2)} Rs/kWh

    UTILITY PROVIDER DETAILS:
    - State: ${discomData.State}
    - DISCOM: ${discomData.DISCOM}
    - Consumer base: ${discomData["Total Number of consumers (Millions)"]} million
    - Power purchase cost: ${discomData["Average power purchase cost (Rs./kWh)"]} Rs/kWh
    - Supply cost: ${discomData["Average Cost of Supply (Rs./kWh)"]} Rs/kWh
    - Billing rate: ${discomData["Average Billing Rate (Rs./kWh)"]} Rs/kWh
    - AT&C losses: ${discomData["AT&C Losses (%)"]}%

    TIME OF USE PATTERNS:
    ${touData.map((t) => `- ${new Date(t.timestamp).toLocaleTimeString()}: ${t.rate} Rs/kWh`).join("\n    ")}

    Analyze and provide:
    1. 24-hour rate forecasts based on historical patterns
    2. Specific times for cost-saving activities
    3. Peak vs off-peak usage strategies
    4. Load shifting opportunities

    Format as JSON with structure:
    {
      "forecasted_rates": [{"time": "HH:MM", "rate": number}],
      "savings_opportunities": ["detailed opportunity 1", "detailed opportunity 2"],
      "pattern_analysis": "string"
    }
  `;

  const aiResponse = await fetchAIResponse(aiPrompt);

  return {
    currentRate: parseFloat(discomData["Average Billing Rate (Rs./kWh)"]),
    averageRate: parseFloat(averageRate.toFixed(2)),
    peakRate: parseFloat(peakRate.toFixed(2)),
    offPeakRate: parseFloat(offPeakRate.toFixed(2)),
    forecastedRates: aiResponse?.forecasted_rates || [],
    savingsOpportunities: aiResponse?.savings_opportunities || [],
    pattern_analysis: aiResponse.pattern_analysis || "",
  };
}

// Generate consumption analytics
async function generateConsumptionAnalytics(
  energyData: EnergyData[],
  weatherData: WeatherData,
): Promise<ConsumptionAnalytics> {
  const dataByDay = groupDataByDay(energyData);
  const days = Array.from(dataByDay.keys()).sort();
  const latestDayData = dataByDay.get(days[days.length - 1]) || [];

  const totalConsumption = latestDayData.reduce(
    (sum, data) => sum + data.Consumption,
    0,
  );

  const peakConsumption = latestDayData.reduce(
    (max, data) =>
      data.Consumption > max.consumption
        ? { time: data.SendDate, consumption: data.Consumption }
        : max,
    { time: "", consumption: 0 },
  );

  const hourlyConsumption = latestDayData.reduce(
    (acc, data) => {
      const hour = new Date(data.SendDate).getHours();
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(data.Consumption);
      return acc;
    },
    {} as Record<number, number[]>,
  );

  const hourlyAverages = Object.entries(hourlyConsumption)
    .map(([hour, values]) => ({
      hour: parseInt(hour),
      average: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.hour - b.hour);

  // Get AI insights for consumption patterns
  const aiPrompt = `
    Analyze energy consumption patterns considering weather impact:

    CONSUMPTION METRICS:
    - Daily total: ${totalConsumption.toFixed(2)} kWh
    - Peak consumption: ${peakConsumption.consumption.toFixed(2)} kWh at ${new Date(peakConsumption.time).toLocaleTimeString()}
    - Average hourly: ${(totalConsumption / 24).toFixed(2)} kWh

    HOURLY CONSUMPTION PATTERN:
    ${hourlyAverages
      .map(
        (h) =>
          `- Hour ${h.hour.toString().padStart(2, "0")}: ${h.average.toFixed(2)} kWh`,
      )
      .join("\n    ")}

    WEATHER CONDITIONS:
    - Temperature: ${weatherData.main.temp}°C
    - Humidity: ${weatherData.main.humidity}%
    - Conditions: ${weatherData.weather[0].main}
    - Details: ${weatherData.weather[0].description}

    Analyze and identify:
    1. Unusual consumption patterns and their causes
    2. Weather impact on energy usage
    3. Time-based optimization opportunities
    4. Specific recommendations for each time of day

    Format response to match ConsumptionAnalytics interface with:
    - unusualPatterns: Array of identified unusual patterns
    - weatherImpact: Weather correlation analysis
    - optimizationOpportunities: List of optimization opportunities
    - timeOfDayRecommendations: Time-specific recommendations
  `;

  const aiResponse = await fetchAIResponse(aiPrompt); // Use insights in future updates

  return {
    totalConsumption: parseFloat(totalConsumption.toFixed(2)),
    averageDailyConsumption: parseFloat((totalConsumption / 24).toFixed(2)),
    peakConsumptionTime: peakConsumption.time,
    peakConsumptionValue: parseFloat(peakConsumption.consumption.toFixed(2)),
    consumptionByTimeOfDay: hourlyAverages,
  };
}

// Generate solar analysis if applicable
async function generateSolarAnalysis(
  energyData: EnergyData[],
  userData: UserData,
  weatherData: WeatherData,
): Promise<SolarAnalysis | null> {
  if (!userData.hasSolarPanels) return null;

  const dataByDay = groupDataByDay(energyData);
  const days = Array.from(dataByDay.keys()).sort();
  const latestDayData = dataByDay.get(days[days.length - 1]) || [];

  const dailyGeneration = latestDayData.reduce(
    (sum, data) => sum + (data.SolarEnergy || 0),
    0,
  );

  const monthlyGeneration = dailyGeneration * 30;
  const theoreticalDaily = userData.solarCapacity * 5.5;
  const efficiency = (dailyGeneration / theoreticalDaily) * 100;
  const savingsFromSolar =
    (dailyGeneration * parseFloat(userData.monthlyBill.toString())) / 30;

  const aiPrompt = `
    Analyze solar system performance and provide optimization guidance:

    SYSTEM SPECIFICATIONS:
    - Solar capacity: ${userData.solarCapacity} kW
    - Battery storage: ${userData.hasBatteryStorage ? userData.storageCapacity + " kWh" : "None"}
    - Daily generation: ${dailyGeneration.toFixed(2)} kWh
    - System efficiency: ${efficiency.toFixed(2)}%
    - Monthly generation: ${monthlyGeneration.toFixed(2)} kWh
    - Daily savings: ${savingsFromSolar.toFixed(2)} Rs

    WEATHER IMPACT:
    - Temperature: ${weatherData.main.temp}°C
    - Weather condition: ${weatherData.weather[0].main}
    - Detailed weather: ${weatherData.weather[0].description}
    - Humidity: ${weatherData.main.humidity}%

    GENERATION DATA:
    ${energyData
      .slice(-24)
      .map(
        (d) =>
          `- ${new Date(d.SendDate).toLocaleTimeString()}: ${d.SolarEnergy?.toFixed(2) || 0} kWh`,
      )
      .join("\n    ")}

    Analyze and provide:
    1. Specific optimization recommendations
    2. Required maintenance tasks
    3. Analysis of weather impact on generation
    4. Battery storage optimization tips (if applicable)

    Format as JSON with structure:
    {
      "optimizations": ["detailed recommendation 1", "detailed recommendation 2"],
      "maintenance_tasks": ["task 1", "task 2"],
      "weather_impact": "string",
      "storage_tips": ["tip 1", "tip 2"]
    }
  `;

  const aiResponse = await fetchAIResponse(aiPrompt);

  return {
    dailyGeneration: parseFloat(dailyGeneration.toFixed(2)),
    monthlyGeneration: parseFloat(monthlyGeneration.toFixed(2)),
    efficiency: parseFloat(efficiency.toFixed(2)),
    savingsFromSolar: parseFloat(savingsFromSolar.toFixed(2)),
    optimizations: aiResponse?.optimizations || [
      "Clean solar panels regularly to maintain efficiency",
      "Consider adjusting panel angles seasonally",
      "Monitor shading patterns throughout the day",
    ],
    maintenance_tasks: aiResponse?.maintenance_tasks || [
      "Clean solar panels regularly to maintain efficiency",
      "Consider adjusting panel angles seasonally",
      "Monitor shading patterns throughout the day",
    ],
    weather_impact: aiResponse?.weather_impact || "",
    storage_tips: aiResponse?.storage_tips || [
      "Consider installing a battery storage system",
      "Regularly monitor battery usage and adjust usage accordingly",
    ],
  };
}

async function fetchAIResponse(prompt: string): Promise<any> {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-groq-70b-8192-tool-use-preview",
          messages: [
            {
              role: "system",
              content:
                "You are an energy analysis expert. Analyze the data and provide detailed insights in JSON format. Focus on actionable recommendations and specific patterns.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      console.log(response);
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("AI API call failed:", error);
    return null;
  }
}

export async function generateReport(
  userData: UserData,
  touData: TOUData[],
  weatherData: WeatherData,
  discomData: Discom,
  energyData: EnergyData[],
): Promise<{
  executiveSummary: ExecutiveSummary;
  tariffAnalysis: TariffAnalysis;
  consumptionAnalytics: ConsumptionAnalytics;
  solarAnalysis: SolarAnalysis | null;
}> {
  try {
    const sortedEnergyData = [...energyData].sort(
      (a, b) => new Date(a.SendDate).getTime() - new Date(b.SendDate).getTime(),
    );

    const [
      executiveSummary,
      tariffAnalysis,
      consumptionAnalytics,
      solarAnalysis,
    ] = await Promise.all([
      calculateExecutiveSummary(
        sortedEnergyData,
        touData,
        userData,
        weatherData,
      ),
      generateTariffAnalysis(touData, discomData),
      generateConsumptionAnalytics(sortedEnergyData, weatherData),
      userData.hasSolarPanels
        ? generateSolarAnalysis(sortedEnergyData, userData, weatherData)
        : Promise.resolve(null),
    ]);

    return {
      executiveSummary,
      tariffAnalysis,
      consumptionAnalytics,
      solarAnalysis,
    };
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error("Failed to generate complete report");
  }
}
