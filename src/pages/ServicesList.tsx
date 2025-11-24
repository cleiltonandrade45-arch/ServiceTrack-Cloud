import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Service } from '../../types';
import { getStatusColor } from '../utils/statusColors';
import { Plus, Search, Calendar, User, ArrowRight } from 'lucide-react';
import DashboardStats from '../components/DashboardStats';

const ServicesList: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dashboard Section */}
      {!loading && services.length > 0 && (
        <DashboardStats services={services} />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Serviços</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie e acompanhe o progresso dos seus projetos</p>
        </div>
        <Link
          to="/services/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Buscar serviços por nome ou status..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1e293b] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum serviço encontrado</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Comece criando um novo serviço ou tente outra busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Link
              key={service.id}
              to={`/services/${service.id}`}
              className="group bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-700 flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(service.status)}`}>
                  {service.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(service.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {service.name}
              </h3>

              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-3 flex-grow">
                {service.description}
              </p>

              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                  <span className="truncate">{service.responsible}</span>
                </div>
                {service.end_date && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                    <span>Fim: {service.end_date}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                  <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                      <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesList;