import React from 'react';
import { Thermometer, Droplets, Sun, Activity, Eye, EyeOff } from 'lucide-react';

interface SensorData {
  soilMoisture: number;
  airHumidity: number;
  airTemperature: number;
  lightIntensity: number;
  lightDetect: boolean;
}

interface MonitoringCardsProps {
  data: SensorData;
}

export default function MonitoringCards({ data }: MonitoringCardsProps) {
  // Determine Peach Health Status based on heuristics
  let healthStatus = 'Rất tốt (Excellent)';
  let healthColor = 'text-emerald-700 bg-emerald-100 border-emerald-500';

  if (data.soilMoisture < 30 || data.airTemperature > 35) {
    healthStatus = 'Nguy hiểm (Nhiệt độ cao / Thiếu Nước)';
    healthColor = 'text-red-700 bg-red-100 border-red-500';
  } else if (data.soilMoisture < 50) {
    healthStatus = 'Cần chú ý (Nên chuẩn bị tưới)';
    healthColor = 'text-yellow-700 bg-yellow-100 border-yellow-500';
  }

  const cards = [
    {
      title: 'Nhiệt độ',
      value: `${data.airTemperature.toFixed(1)}°C`,
      icon: <Thermometer className="h-6 w-6 text-orange-500" />,
      color: 'bg-white',
    },
    {
      title: 'Độ ẩm Không khí',
      value: `${data.airHumidity.toFixed(1)}%`,
      icon: <Droplets className="h-6 w-6 text-blue-500" />,
      color: 'bg-white',
    },
    {
      title: 'Độ ẩm Đất',
      value: `${data.soilMoisture.toFixed(1)}%`,
      icon: <Activity className="h-6 w-6 text-emerald-600" />,
      color: 'bg-white',
    },
    {
      title: 'Cường độ Sáng',
      value: `${data.lightIntensity.toFixed(0)} Lux`,
      icon: <Sun className="h-6 w-6 text-yellow-500" />,
      color: 'bg-white',
    },
    {
      title: 'Trạng thái Ánh sáng (LDR)',
      value: data.lightDetect ? 'Đang sáng (True)' : 'Tối (False)',
      icon: data.lightDetect ? <Eye className="h-6 w-6 text-indigo-500" /> : <EyeOff className="h-6 w-6 text-slate-400" />,
      color: 'bg-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Peach Health Status Indicator */}
      <div
        className={`flex items-center p-4 rounded-xl border-2 shadow-sm ${healthColor} transition-colors duration-300`}
      >
        <Activity className="h-8 w-8 mr-3" />
        <div>
          <h2 className="text-xl font-bold">Tình trạng Cây Đào</h2>
          <p className="font-medium">{healthStatus}</p>
        </div>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow duration-300 ${card.color}`}
          >
            <div className="p-3 bg-slate-50 rounded-full mb-3">
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">
              {card.title}
            </h3>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
