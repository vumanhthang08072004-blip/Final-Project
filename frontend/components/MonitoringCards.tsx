import React from 'react';
import { Thermometer, Droplets, Sun, Activity, Leaf } from 'lucide-react';
import { FaSeedling } from 'react-icons/fa';
import { PiFlowerLotusFill } from 'react-icons/pi';
import { HiOutlineLightningBolt } from 'react-icons/hi';

interface SensorData {
  soilMoisture: number;
  airHumidity: number;
  airTemperature: number;
  lightIntensity: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
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

  const environmentCards = [
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
  ];

  const npkCards = [
    {
      title: 'Nitơ (N)',
      subtitle: 'Phát triển lá & thân',
      value: `${data.nitrogen}`,
      unit: 'mg/kg',
      icon: <FaSeedling className="h-6 w-6 text-green-500" />,
      gradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-300',
      accentBg: 'bg-green-100',
      valueColor: 'text-green-700',
      barColor: 'bg-green-400',
    },
    {
      title: 'Photpho (P)',
      subtitle: 'Kích thích rễ & nụ hoa',
      value: `${data.phosphorus}`,
      unit: 'mg/kg',
      icon: <PiFlowerLotusFill className="h-6 w-6 text-red-500" />,
      gradient: 'from-red-50 to-rose-50',
      borderColor: 'border-red-300',
      accentBg: 'bg-red-100',
      valueColor: 'text-red-600',
      barColor: 'bg-red-400',
    },
    {
      title: 'Kali (K)',
      subtitle: 'Hoa đẹp & chống chịu',
      value: `${data.potassium}`,
      unit: 'mg/kg',
      icon: <HiOutlineLightningBolt className="h-6 w-6 text-orange-500" />,
      gradient: 'from-orange-50 to-amber-50',
      borderColor: 'border-orange-300',
      accentBg: 'bg-orange-100',
      valueColor: 'text-orange-600',
      barColor: 'bg-orange-400',
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

      {/* Environment Sensor Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {environmentCards.map((card, idx) => (
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

      {/* NPK Soil Nutrient Cards */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg mr-3">
            <Leaf className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-800">Dinh dưỡng Đất (NPK Sensor)</h3>
            <p className="text-xs text-emerald-600 font-medium">Soil NPK Measure Sensor (IP68, RS485 Modbus)</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {npkCards.map((card, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center p-5 rounded-xl shadow-sm border ${card.borderColor} bg-gradient-to-b ${card.gradient} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
            >
              <div className={`p-3 ${card.accentBg} rounded-full mb-3`}>
                {card.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-0.5">
                {card.title}
              </h3>
              <p className="text-[11px] text-gray-400 mb-2">{card.subtitle}</p>
              <p className={`text-3xl font-extrabold ${card.valueColor}`}>{card.value}</p>
              <span className="text-xs font-medium text-gray-400 mt-1">{card.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
