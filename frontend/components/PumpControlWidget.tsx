'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Power } from 'lucide-react';
import { API_URL } from './config';

interface PumpState {
  id: number;
  isAuto: boolean;
  isOn: boolean;
}

export default function PumpControlWidget() {
  const [pumpState, setPumpState] = useState<PumpState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const fetchPumpState = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pump/state`);
      const data = await res.json();
      setPumpState(data);
    } catch (err) {
      console.error('Failed to fetch pump state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPumpState();
    const interval = setInterval(fetchPumpState, 5000); // Polling every 5s to get real-time state
    return () => clearInterval(interval);
  }, []);

  const handleToggleMode = async () => {
    if (!pumpState) return;
    setIsToggling(true);
    try {
      await fetch(`${API_URL}/api/pump/mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAuto: !pumpState.isAuto }),
      });
      await fetchPumpState();
    } catch (err) {
      console.error('Failed to toggle mode', err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleTogglePump = async () => {
    if (!pumpState || pumpState.isAuto) return; // Cannot toggle manually in Auto Mode
    setIsToggling(true);
    try {
      const targetState = !pumpState.isOn;
      await fetch(`${API_URL}/api/pump/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOn: targetState }),
      });
      await fetchPumpState();
    } catch (err) {
      console.error('Failed to toggle pump', err);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading && !pumpState) {
    return <div className="p-6 rounded-2xl shadow-md bg-white animate-pulse h-32"></div>;
  }

  if (!pumpState) {
    return null;
  }

  return (
    <div className="p-6 rounded-2xl shadow-md bg-white border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Settings className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-bold text-gray-800">Điều khiển Máy Bơm</h3>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${pumpState.isOn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
          {pumpState.isOn ? 'ĐANG BƠM' : 'ĐÃ TẮT'}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div>
          <p className="text-sm font-semibold text-gray-700">Chế độ hoạt động</p>
          <div className="flex items-center mt-2 space-x-2">
            <button
              onClick={handleToggleMode}
              disabled={isToggling}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition ${pumpState.isAuto ? 'bg-green-500 text-white shadow-inner' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Tự động (Auto)
            </button>
            <button
              onClick={handleToggleMode}
              disabled={isToggling}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition ${!pumpState.isAuto ? 'bg-orange-500 text-white shadow-inner' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Thủ công (Manual)
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-700 mb-2">Thao tác</p>
          <button
            onClick={handleTogglePump}
            disabled={pumpState.isAuto || isToggling}
            className={`p-3 rounded-full transition-all flex items-center justify-center shadow-md ${
              pumpState.isAuto 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : pumpState.isOn 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Power className="h-6 w-6" />
          </button>
          {!pumpState.isAuto && (
            <span className="text-xs text-gray-500 mt-1">{pumpState.isOn ? 'Nhấn để Tắt' : 'Nhấn để Bật'}</span>
          )}
        </div>
      </div>
      
      {pumpState.isAuto && (
        <p className="text-xs text-gray-500 mt-4 italic">
          * Đang bật Tự động: Hệ thống sẽ tự kiểm tra Nhiệt/Ẩm với cấu hình Growth Stage để bật/tắt bơm.
        </p>
      )}
    </div>
  );
}
