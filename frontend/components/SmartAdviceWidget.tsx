'use client';

import React, { useEffect, useState } from 'react';
import { CloudRain, Sun, AlertTriangle, Droplets } from 'lucide-react';

export default function SmartAdviceWidget() {
  const [advice, setAdvice] = useState<string>('Đang phân tích dữ liệu thời tiết Nhật Tân...');
  const [rainRisk, setRainRisk] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeatherAdvice() {
      try {
        const response = await fetch('http://localhost:3001/api/weather/forecast');
        if (!response.ok) throw new Error('Failed to fetch weather');
        
        const weatherData = await response.json();
        
        // Find if there's significant rain in the next 3 days
        const today = new Date();
        const next3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const upcomingRainDays = weatherData.filter((day: any) => {
           const dDate = new Date(day.date);
           return dDate <= next3Days && day.rainVolume > 5; // e.g. more than 5mm rain
        });

        if (upcomingRainDays.length > 0) {
          const daysUntilRain = Math.max(1, Math.round((new Date(upcomingRainDays[0].date).getTime() - today.getTime()) / (1000 * 3600 * 24)));
          setRainRisk(true);
          setAdvice(`Dự kiến trong khoản ${daysUntilRain} ngày tới trời có mưa tại Nhật Tân, hệ thống tự động đã tính toán độ ẩm đất dự kiến tăng nhanh. Tạm dừng hệ thống tưới tự động để tránh ngập úng gốc Đào.`);
        } else {
          setRainRisk(false);
          setAdvice('Dự báo thời tiết những ngày tới khô ráo. Hệ thống tưới tiêu tự động sẽ được kích hoạt theo đúng lịch trình duy trì độ ẩm 40-50% cho đất thịt.');
        }
      } catch (err) {
        console.error(err);
        setAdvice('Chưa thể lấy thông tin. Đang sử dụng cấu hình tưới mặc định.');
      } finally {
        setLoading(false);
      }
    }

    fetchWeatherAdvice();
    const interval = setInterval(fetchWeatherAdvice, 120 * 1000); // 2 min refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`p-6 rounded-2xl shadow-md border-l-4 ${rainRisk ? 'bg-blue-50 border-blue-500' : 'bg-orange-50 border-orange-500'}`}>
      <div className="flex items-center mb-3">
        {rainRisk ? (
          <CloudRain className="h-7 w-7 text-blue-500 mr-3" />
        ) : (
          <Sun className="h-7 w-7 text-orange-500 mr-3" />
        )}
        <h3 className={`text-xl font-bold ${rainRisk ? 'text-blue-800' : 'text-orange-800'}`}>Smart Advice (Nhật Tân Station)</h3>
      </div>
      
      {loading ? (
        <div className="flex animate-pulse space-x-4 h-6 w-full bg-gray-200 rounded"></div>
      ) : (
        <p className={`text-base font-medium leading-relaxed ${rainRisk ? 'text-blue-900' : 'text-orange-900'}`}>
          {advice}
        </p>
      )}

      {rainRisk && !loading && (
        <div className="mt-4 inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
          <Droplets className="h-4 w-4 mr-1" />
          Auto-Irrigation: DISABLED
        </div>
      )}
    </div>
  );
}
