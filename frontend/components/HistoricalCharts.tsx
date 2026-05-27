'use client'; // Required for recharts in Next.js App Router

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface HistoricalData {
  time: string;
  soilMoisture: number | null;
  airHumidity: number | null;
  predictedMoisture?: number | null;
}

interface HistoricalChartsProps {
  data: HistoricalData[];
}

export default function HistoricalCharts({ data }: HistoricalChartsProps) {
  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
      <h3 className="text-xl font-bold text-emerald-800 mb-4">
        Moisture & Humidity Trends
      </h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            className="font-sans"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="soilMoisture"
              stroke="#059669" // emerald-600
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Soil Moisture (%)"
            />
            <Line
              type="monotone"
              dataKey="airHumidity"
              stroke="#3b82f6" // blue-500
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Air Humidity (%)"
            />
            {/* Render predicted moisture if available */}
            <Line
              type="monotone"
              dataKey="predictedMoisture"
              stroke="#eab308" // yellow-500
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="Predicted Soil Moisture (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
