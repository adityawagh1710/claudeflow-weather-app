export type TempUnit = "celsius" | "fahrenheit";
export type WindUnit = "kmh" | "mph";
export type TimeFormat = "12h" | "24h";
export type Theme = "light" | "dark" | "system";

export type WeatherSnapshot = {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    isDay: boolean;
    observedAt: string;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    weatherCode: number;
    precipProbability: number;
  }>;
  daily: Array<{
    date: string;
    tempMin: number;
    tempMax: number;
    weatherCode: number;
    sunrise: string;
    sunset: string;
    uvIndexMax: number;
  }>;
  airQuality: {
    aqi: number;
    category: string;
    pm25?: number;
    pm10?: number;
  } | null;
  fetchedAt: string;
};

export type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

export class ProviderError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
