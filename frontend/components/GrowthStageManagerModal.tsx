'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, Save } from 'lucide-react';

interface GrowthStage {
  id?: string;
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
  isActive?: boolean;
}

const DEFAULT_STAGE: GrowthStage = {
  name: '',
  description: '',
  tempMin: 0,
  tempMax: 0,
  moistureMin: 0,
  moistureMax: 0,
  lightMin: 0,
  lightMax: 0,
  nitrogenRatio: 0,
  phosphorusRatio: 0,
  potassiumRatio: 0,
  fertilizerAmount: ''
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function GrowthStageManagerModal({ isOpen, onClose, onRefresh }: Props) {
  const [stages, setStages] = useState<GrowthStage[]>([]);
  const [editingStage, setEditingStage] = useState<GrowthStage | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStages = async () => {
    try {
      const res = await fetch('http://localhost:3001/growth-stages');
      const data = await res.json();
      setStages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStages();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá chế độ này?')) return;
    try {
      await fetch(`http://localhost:3001/growth-stages/${id}`, { method: 'DELETE' });
      fetchStages();
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Không thể xoá vì đang lỗi mạng hoặc cấu hình đang được bật.');
    }
  };

  const handleSave = async () => {
    if (!editingStage) return;
    setLoading(true);
    
    // Parse numeric inputs appropriately
    const payload = {
      ...editingStage,
      tempMin: Number(editingStage.tempMin),
      tempMax: Number(editingStage.tempMax),
      moistureMin: Number(editingStage.moistureMin),
      moistureMax: Number(editingStage.moistureMax),
      lightMin: Number(editingStage.lightMin),
      lightMax: Number(editingStage.lightMax),
      nitrogenRatio: Number(editingStage.nitrogenRatio),
      phosphorusRatio: Number(editingStage.phosphorusRatio),
      potassiumRatio: Number(editingStage.potassiumRatio)
    };

    try {
      if (editingStage.id) {
        // Update
        await fetch(`http://localhost:3001/growth-stages/${editingStage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        await fetch(`http://localhost:3001/growth-stages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setEditingStage(null);
      fetchStages();
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Lưu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-green-600 p-4 text-white">
          <h2 className="text-xl font-bold">Quản lý Cấu hình Sinh trưởng</h2>
          <button onClick={onClose} className="hover:bg-green-500 p-1 rounded transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:flex gap-6 relative">
          
          {/* Left panel: List of stages */}
          <div className="md:w-1/3 mb-6 md:mb-0 border-r pr-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">Các chế độ hiện có</h3>
              <button 
                onClick={() => setEditingStage({ ...DEFAULT_STAGE })}
                className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200 transition"
                title="Thêm mới"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {stages.map(stage => (
                <div key={stage.id} className="border border-green-200 rounded p-3 hover:shadow-md transition bg-gray-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{stage.name}</h4>
                    {stage.isActive && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full mt-1 inline-block">Đang bật</span>}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingStage(stage)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!stage.isActive && (
                      <button 
                        onClick={() => stage.id && handleDelete(stage.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Editor */}
          <div className="md:w-2/3">
            {editingStage ? (
              <div className="bg-gray-50 border rounded-lg p-5">
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">
                  {editingStage.id ? 'Chỉnh sửa chế độ' : 'Tạo mới chế độ'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="md:col-span-2">
                    <label className="block text-gray-600 mb-1">Tên Giai đoạn</label>
                    <input 
                      type="text"
                      className="w-full border rounded p-2 focus:ring-green-500 focus:border-green-500"
                      value={editingStage.name}
                      onChange={e => setEditingStage({...editingStage, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-gray-600 mb-1">Mô tả ngắn</label>
                    <input 
                      type="text"
                      className="w-full border rounded p-2 focus:ring-green-500 focus:border-green-500"
                      value={editingStage.description}
                      onChange={e => setEditingStage({...editingStage, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Nhiệt độ tối thiểu (°C)</label>
                    <input type="number" step="0.1" className="w-full border rounded p-2"
                      value={editingStage.tempMin} onChange={e => setEditingStage({...editingStage, tempMin: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                     <label className="block text-gray-600 mb-1">Nhiệt độ tối đa (°C)</label>
                    <input type="number" step="0.1" className="w-full border rounded p-2"
                      value={editingStage.tempMax} onChange={e => setEditingStage({...editingStage, tempMax: parseFloat(e.target.value)})}
                    />
                   </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Độ ẩm đất tối thiểu (%)</label>
                    <input type="number" step="0.1" className="w-full border rounded p-2"
                      value={editingStage.moistureMin} onChange={e => setEditingStage({...editingStage, moistureMin: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Độ ẩm đất tối đa (%)</label>
                    <input type="number" step="0.1" className="w-full border rounded p-2"
                      value={editingStage.moistureMax} onChange={e => setEditingStage({...editingStage, moistureMax: parseFloat(e.target.value)})}
                    />
                   </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Ánh sáng tối thiểu (Lux)</label>
                    <input type="number" className="w-full border rounded p-2"
                      value={editingStage.lightMin} onChange={e => setEditingStage({...editingStage, lightMin: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Ánh sáng tối đa (Lux)</label>
                    <input type="number" className="w-full border rounded p-2"
                      value={editingStage.lightMax} onChange={e => setEditingStage({...editingStage, lightMax: parseInt(e.target.value)})}
                    />
                   </div>

                   <div className="md:col-span-2 border-t pt-3 mt-1">
                      <p className="font-semibold text-gray-700 mb-2">Tỉ lệ phân bón (Gợi ý)</p>
                      <div className="grid grid-cols-3 gap-2">
                         <div>
                           <label className="block text-xs text-gray-500">Nitơ (N)</label>
                           <input type="number" className="w-full border rounded p-1"
                             value={editingStage.nitrogenRatio} onChange={e => setEditingStage({...editingStage, nitrogenRatio: parseFloat(e.target.value)})}
                           />
                         </div>
                         <div>
                           <label className="block text-xs text-gray-500">Photpho (P)</label>
                           <input type="number" className="w-full border rounded p-1"
                             value={editingStage.phosphorusRatio} onChange={e => setEditingStage({...editingStage, phosphorusRatio: parseFloat(e.target.value)})}
                           />
                         </div>
                         <div>
                           <label className="block text-xs text-gray-500">Kali (K)</label>
                           <input type="number" className="w-full border rounded p-1"
                             value={editingStage.potassiumRatio} onChange={e => setEditingStage({...editingStage, potassiumRatio: parseFloat(e.target.value)})}
                           />
                         </div>
                      </div>
                   </div>

                   <div className="md:col-span-2">
                    <label className="block text-gray-600 mb-1">Chỉ định Liều lượng (Text)</label>
                    <input 
                      type="text"
                      className="w-full border rounded p-2 focus:ring-green-500 focus:border-green-500"
                      value={editingStage.fertilizerAmount}
                      onChange={e => setEditingStage({...editingStage, fertilizerAmount: e.target.value})}
                      placeholder="VD: 1 - 1.2kg/gốc"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button onClick={() => setEditingStage(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Hủy</button>
                  <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center">
                    <Save className="h-4 w-4 mr-2" /> Lưu lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 p-10 text-center">
                Vui lòng chọn một chế độ bên danh sách Trái để chỉnh sửa, hoặc bấm dấu + để tạo mới.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
