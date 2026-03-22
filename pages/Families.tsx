import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Family } from '../types';
import { Plus, Trash2, Edit2, Save, X, Tag } from 'lucide-react';

export const Families: React.FC = () => {
  const { families, addFamily, updateFamily, deleteFamily } = useBakery();
  
  const sortedFamilies = [...families].sort((a, b) => a.name.localeCompare(b.name));

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addFamily({ id: Date.now().toString(), name: newName.trim() });
    setNewName('');
    setIsAdding(false);
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateFamily({ id, name: editName.trim() });
    setEditingId(null);
  };

  const startEdit = (family: Family) => {
    setEditingId(family.id);
    setEditName(family.name);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="text-indigo-600" /> Familias de Productos
          </h2>
          <p className="text-slate-500 text-sm">Gestiona las categorías para agrupar tus productos en el catálogo.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus size={20} /> Nueva Familia
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1">
            <input
              autoFocus
              type="text"
              placeholder="Nombre de la familia (ej: Tortas, Galletas...)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">
              <Save size={20} />
            </button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-100 text-slate-500 p-2 rounded-lg hover:bg-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFamilies.map(family => (
          <div key={family.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-100 transition-all flex items-center justify-between group">
            {editingId === family.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate(family.id)}
                  className="flex-1 px-3 py-1 border border-indigo-300 rounded-lg focus:outline-none"
                />
                <button onClick={() => handleUpdate(family.id)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded">
                  <Save size={18} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-400 p-1 hover:bg-slate-50 rounded">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Tag size={18} />
                  </div>
                  <span className="font-semibold text-slate-700">{family.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(family)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteFamily(family.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {families.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Tag size={48} className="mx-auto mb-3 opacity-20" />
            <p>No hay familias creadas.</p>
            <button onClick={() => setIsAdding(true)} className="text-indigo-600 font-medium mt-2 hover:underline">
              Crear la primera familia
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
