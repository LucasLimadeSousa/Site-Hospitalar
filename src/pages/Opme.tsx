import { useState } from 'react';
import { Package, Search, RefreshCw, Eye, CheckCircle, Clock } from 'lucide-react';

interface OpmeItem {
  id: string;
  code: string;
  surgeryName: string;
  doctor: string;
  supplier: string;
  status: 'Pendente' | 'Liberado';
  materials: string[];
}

export function Opme() {
  const [items, setItems] = useState<OpmeItem[]>([
    {
      id: '1',
      code: 'OPME-001234',
      surgeryName: 'Artroplastia Total do Joelho (Prótese)',
      doctor: 'Dr. Rafael Mendes',
      supplier: 'Zimmer Biomet',
      status: 'Pendente',
      materials: ['Prótese Total de Joelho em Titânio', 'Cimento Ósseo (2 unidades)']
    },
    {
      id: '2',
      code: 'OPME-001235',
      surgeryName: 'Histerectomia Total (Malha Cirúrgica)',
      doctor: 'Dr. Rafael Mendes',
      supplier: 'Zimmer Biomet',
      status: 'Liberado',
      materials: ['Malha Cirúrgica Polipropileno', 'Grampeador Endoscópico']
    }
  ]);

  const [selectedItem, setSelectedItem] = useState<OpmeItem | null>(null);

  const toggleStatus = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newStatus = item.status === 'Pendente' ? 'Liberado' : 'Pendente';
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="h-8 w-8 text-brand" />
            OPME
          </h1>
          <p className="text-sm text-slate-500 mt-1">Cirurgias autorizadas que aguardam liberação de materiais especiais junto aos fornecedores</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, cirurgia, médico ou fornecedor..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <select className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 bg-white">
            <option>Todos os status</option>
            <option>Pendente</option>
            <option>Liberado</option>
          </select>
          <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4">Código</th>
              <th className="p-4">Cirurgia</th>
              <th className="p-4">Médico</th>
              <th className="p-4">Fornecedor Indicação</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-bold text-slate-800">{item.code}</td>
                <td className="p-4 text-slate-700 font-medium">{item.surgeryName}</td>
                <td className="p-4 text-slate-600">{item.doctor}</td>
                <td className="p-4 text-slate-600">{item.supplier}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'Liberado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'Liberado' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {item.status === 'Liberado' ? 'Disponível' : 'Pendente'}
                    </span>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={item.status === 'Liberado'} 
                        onChange={() => toggleStatus(item.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Detalhes do Material
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Detalhes da Solicitação - {selectedItem.code}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm"><strong className="text-slate-700">Procedimento:</strong> {selectedItem.surgeryName}</p>
              <p className="text-sm"><strong className="text-slate-700">Médico Responsável:</strong> {selectedItem.doctor}</p>
              <p className="text-sm"><strong className="text-slate-700">Fornecedor:</strong> {selectedItem.supplier}</p>
              <div>
                <strong className="text-sm text-slate-700 block mb-2">Lista de Materiais Solicitados:</strong>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedItem.materials.map((mat, i) => (
                    <li key={i}>{mat}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}