'use client';

import React, { useEffect, useState } from 'react';
import MonitoringCards from '../components/MonitoringCards';
import HistoricalCharts from '../components/HistoricalCharts';
import SmartAdviceWidget from '../components/SmartAdviceWidget';
import GrowthStageSelector from '../components/GrowthStageSelector';
import PumpControlWidget from '../components/PumpControlWidget';
import { AlertCircle } from 'lucide-react';
import { API_URL } from '../components/config';

export default function DashboardPage() {
  const [currentData, setCurrentData] = useState({
    soilMoisture: 0,
    airHumidity: 0,
    airTemperature: 0,
    lightIntensity: 0,
    nitrogen: 0,
    phosphorus: 0,
    potassium: 0,
    timestamp: '',
  });

  const [displayTime, setDisplayTime] = useState<Date | null>(null);
  const [historicalTrends, setHistoricalTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hiệu ứng "đồng hồ chạy từng giây" đồng bộ từ ESP32
  useEffect(() => {
    if (!currentData.timestamp) return;
    
    // Khởi tạo thời gian hiển thị bằng thời gian của ESP32
    setDisplayTime(new Date(currentData.timestamp));
    
    // Mỗi giây cộng thêm 1000ms
    const interval = setInterval(() => {
      setDisplayTime(prev => prev ? new Date(prev.getTime() + 1000) : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentData.timestamp]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch current sensor reading
        const sensorRes = await fetch(`${API_URL}/api/sensor-data/latest`);
        const sensorData = await sensorRes.json();
        
        if (sensorData && sensorData.length > 0) {
          setCurrentData(sensorData[0]);
        }

        // Fetch predictions
        const predRes = await fetch(`${API_URL}/api/prediction/latest`);
        const predictionData = await predRes.json();

        // Map predictions to chart format
        // The Chart needs { time, soilMoisture, airHumidity, predictedMoisture }
        
        // History Data (Actuals)
        const histRes = await fetch(`${API_URL}/api/sensor-data/history`);
        const historyData = await histRes.json();

        const mappedTrends = [];
        
        // Push actual past records (Aggregate by Hour to reduce noise but retain line shape)
        if (historyData && historyData.length > 0) {
          const aggregates: Record<string, { moistureSum: number; humiditySum: number; count: number }> = {};
          
          historyData.forEach((record: any) => {
            // Group by DD/MM HH:00
            const dateObj = new Date(record.timestamp);
            const keyStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.getHours().toString().padStart(2, '0') + ':00';
            
            if (!aggregates[keyStr]) {
              aggregates[keyStr] = { moistureSum: 0, humiditySum: 0, count: 0 };
            }
            aggregates[keyStr].moistureSum += record.soilMoisture;
            aggregates[keyStr].humiditySum += record.airHumidity || 0;
            aggregates[keyStr].count += 1;
          });

          for (const [key, data] of Object.entries(aggregates)) {
            mappedTrends.push({
              time: key,
              soilMoisture: Number((data.moistureSum / data.count).toFixed(1)),
              airHumidity: Number((data.humiditySum / data.count).toFixed(1)),
              predictedMoisture: null,
            });
          }
        }

        // Push future predicted records
        if (predictionData && predictionData.length > 0) {
          predictionData.forEach((pred: any) => {
            mappedTrends.push({
              time: new Date(pred.forecastDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
              soilMoisture: null,
              predictedMoisture: pred.predictedValue,
            });
          });
        }

        setHistoricalTrends(mappedTrends);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const needsSmartAlert = currentData.soilMoisture < 30 && currentData.soilMoisture > 0;

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-emerald-700 text-white p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              HỆ THỐNG GIÁM SÁT CHẤT LƯỢNG VƯỜN ĐÀO NHẬT TÂN
            </h1>
          </div>
          <div className="mt-4 md:mt-0 px-4 py-2 bg-emerald-800 rounded-lg shadow-inner flex flex-col md:items-end">
            <div className="flex items-center">
              <span className="text-sm font-bold opacity-80">Live Data</span>
              {isLoading && <span className="ml-2 animate-pulse text-emerald-300">...loading</span>}
            </div>
            {displayTime && (
              <div className="text-xs text-emerald-200 mt-1 font-medium flex items-center">
                <span className="mr-1">⏱</span> 
                {displayTime.toLocaleString('vi-VN', { 
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                  day: '2-digit', month: '2-digit', year: 'numeric' 
                })}
              </div>
            )}
          </div>
        </header>

        {/* Smart Alerts Section */}
        {needsSmartAlert && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start animate-pulse">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-bold">SMART ALERT</h3>
              <p className="text-red-700 text-sm mt-1">
                Độ ẩm đất chỉ ở mức {currentData.soilMoisture}%. Bơm tự động đã được kích hoạt!
              </p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-lime-500 w-2 h-8 rounded-full mr-3 inline-block"></span>
                Thông số trực tiếp (ESP32 via MQTT)
              </h2>
              <MonitoringCards data={currentData} />
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-emerald-500 w-2 h-8 rounded-full mr-3 inline-block"></span>
                Phân tích và Dự báo Độ Ẩm đất thịt
              </h2>
              <HistoricalCharts data={historicalTrends} />
            </section>
          </div>

          {/* Right Column / Widgets */}
          <div className="space-y-8">
             <section className="mt-2 md:mt-0">
               <PumpControlWidget />
             </section>
             <section>
               <GrowthStageSelector />
             </section>
             <section>
               <SmartAdviceWidget />
             </section>
          </div>

        </div>
        
      </div>
    </div>
  );
}

