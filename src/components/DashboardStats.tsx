import React from 'react';
import { Service } from '../../types';
import { CheckCircle, Clock, AlertCircle, PlayCircle, XCircle } from 'lucide-react';

interface DashboardStatsProps {
  services: Service[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ services }) => {
  const total = services.length;
  const pending = services.filter(s => s.status === 'Pendente').length;
  const inProgress = services.filter(s => s.status === 'Andamento').length;
  const analysis = services.filter(s => s.status === 'Análise').length;
  const completed = services.filter(s => s.status === 'Concluído').length;
  const canceled = services.filter(s => s.status === 'Cancelado').length;

  // Calculate percentages for donut chart
  const getOffset = (count: number, total: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const completedPct = getOffset(completed, total);
  const inProgressPct = getOffset(inProgress, total);
  const analysisPct = getOffset(analysis, total);
  const pendingPct = getOffset(pending, total);
  
  // Create stroke-dasharray for svg circle
  // Circumference of r=16 is approx 100
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Cards de Resumo */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Serviços</p>
                    <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{total}</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">Visão geral da carteira</div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Concluídos</p>
                    <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{completed}</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
                {total > 0 ? `${Math.round((completed / total) * 100)}% de taxa de sucesso` : 'Sem dados'}
            </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Em Aberto</p>
                    <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                        {pending + inProgress + analysis}
                    </h3>
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <PlayCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
            </div>
             <div className="mt-4 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">{pending} Pendentes</span>
                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-300">{analysis} Análise</span>
            </div>
        </div>
      </div>

      {/* Gráfico Visual Simplificado (CSS/SVG Only) */}
      <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 w-full mb-4">Distribuição de Status</h3>
        
        {total === 0 ? (
             <div className="text-gray-400 text-sm py-8">Sem dados para gráfico</div>
        ) : (
            <div className="flex items-center gap-8 w-full justify-center">
                {/* Custom Donut Chart using SVG */}
                <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <path className="text-gray-100 dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        
                        {/* Segments */}
                        {completedPct > 0 && (
                            <circle r="15.9155" cx="18" cy="18" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray={`${completedPct}, 100`} className="text-green-600" />
                        )}
                        {inProgressPct > 0 && (
                            <circle r="15.9155" cx="18" cy="18" fill="none" stroke="#ca8a04" strokeWidth="4" strokeDasharray={`${inProgressPct}, 100`} strokeDashoffset={`-${completedPct}`} className="text-yellow-600" />
                        )}
                        {analysisPct > 0 && (
                            <circle r="15.9155" cx="18" cy="18" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray={`${analysisPct}, 100`} strokeDashoffset={`-${completedPct + inProgressPct}`} className="text-blue-600" />
                        )}
                        {pendingPct > 0 && (
                            <circle r="15.9155" cx="18" cy="18" fill="none" stroke="#dc2626" strokeWidth="4" strokeDasharray={`${pendingPct}, 100`} strokeDashoffset={`-${completedPct + inProgressPct + analysisPct}`} className="text-red-600" />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                        <span className="text-xl font-bold text-gray-800 dark:text-white">{total}</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">Concluído</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">Andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">Análise</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">Pendente</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;