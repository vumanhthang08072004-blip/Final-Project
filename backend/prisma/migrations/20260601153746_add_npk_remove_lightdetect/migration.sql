-- CreateTable
CREATE TABLE "SensorData" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL DEFAULT 'ESP32_Thang',
    "soilMoisture" DOUBLE PRECISION NOT NULL,
    "airHumidity" DOUBLE PRECISION NOT NULL,
    "airTemperature" DOUBLE PRECISION NOT NULL,
    "lightIntensity" DOUBLE PRECISION NOT NULL,
    "airPressure" DOUBLE PRECISION,
    "nitrogen" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rainProbability" DOUBLE PRECISION NOT NULL,
    "rainVolume" DOUBLE PRECISION NOT NULL,
    "avgTemp" DOUBLE PRECISION NOT NULL,
    "isForecast" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Predictions" (
    "id" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tempMin" DOUBLE PRECISION,
    "tempMax" DOUBLE PRECISION,
    "moistureMin" DOUBLE PRECISION,
    "moistureMax" DOUBLE PRECISION,
    "lightMin" DOUBLE PRECISION,
    "lightMax" DOUBLE PRECISION,
    "nitrogenRatio" DOUBLE PRECISION,
    "phosphorusRatio" DOUBLE PRECISION,
    "potassiumRatio" DOUBLE PRECISION,
    "fertilizerAmount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isAuto" BOOLEAN NOT NULL DEFAULT true,
    "isOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PumpState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensorData_timestamp_idx" ON "SensorData"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "WeatherData_date_idx" ON "WeatherData"("date" ASC);

-- CreateIndex
CREATE INDEX "Predictions_forecastDate_idx" ON "Predictions"("forecastDate" ASC);
