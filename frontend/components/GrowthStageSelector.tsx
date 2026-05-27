'use client';

import React, { useEffect, useState } from 'react';
import { Leaf, Thermometer, Activity, Sun, Beaker, Settings2 } from 'lucide-react';
import GrowthStageManagerModal from './GrowthStageManagerModal';
import { API_URL } from './config';

interface GrowthStage {
  id: string;
  name: string;
  description: string;
  tempMin: number;
  tempMax: number;
  moistureMin: number;
  moistureMax: number;
  lightMin: number;
  lightMax: number;
  nitrogenRatio: number;
  phosphorusRatio: number;
  potassiumRatio: number;
  fertilizerAmount: string;
  isActive: boolean;
}

export default function GrowthStageSelector() {
  const [stages, setStages] = useState<GrowthStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStages = async () => {
    try {
      const res = await fetch(`${API_URL}/growth-stages`);
      const data = await res.json();
      setStages(data);
      const active = data.find((s: GrowthStage) => s.isActive);
      if (active) setActiveStageId(active.id);
    } catch (err) {
      console.error('Failed to fetch growth stages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/growth-stages/${id}/activate`, {
        method: 'PUT',
      });
      await fetchStages();
    } catch (err) {
      console.error('Failed to activate stage', err);
      setLoading(false);
    }
  };

  const activeStage = stages.find(s => s.id === activeStageId);

  if (loading && !stages.length) {
    return <div className="p-6 rounded-2xl shadow-md bg-white animate-pulse h-48"></div>;
  }

  return (
    <div className="p-6 rounded-2xl shadow-md bg-white border border-green-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Leaf className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-bold text-gray-800">Cấu hình Sinh trưởng</h3>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-gray-500 hover:text-green-600 transition p-1 hover:bg-green-50 rounded"
          title="Quản lý các Giai đoạn"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn giai đoạn (Mode):</label>
        <select 
          className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 p-2 border"
          value={activeStageId || ''}
          onChange={(e) => handleActivate(e.target.value)}
          disabled={loading}
        >
          {stages.map(stage => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      {activeStage && (
        <div className="bg-green-50 p-4 rounded-lg space-y-3 mt-4 text-sm text-gray-700">
          <p className="font-semibold text-green-800">{activeStage.description}</p>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center">
              <Thermometer className="h-4 w-4 mr-1 text-red-500" />
              <span>{activeStage.tempMin} - {activeStage.tempMax}°C</span>
            </div>
            <div className="flex items-center">
              <Activity className="h-4 w-4 mr-1 text-emerald-600" />
              <span>{activeStage.moistureMin} - {activeStage.moistureMax}%</span>
            </div>
            <div className="flex items-center">
              <Sun className="h-4 w-4 mr-1 text-orange-500" />
              <span>{activeStage.lightMin/1000}k - {activeStage.lightMax/1000}k lux</span>
            </div>
            <div className="flex items-center">
              <Beaker className="h-4 w-4 mr-1 text-purple-500" />
              <span>NPK {activeStage.nitrogenRatio}:{activeStage.phosphorusRatio}:{activeStage.potassiumRatio}</span>
            </div>
          </div>
          <div className="mt-2 text-xs bg-white p-2 rounded border border-green-100">
            <strong>Bón phân:</strong> {activeStage.fertilizerAmount}
          </div>
        </div>
      )}

      <GrowthStageManagerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchStages}
      />
    </div>
  );
}
