import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Service, STATUS_OPTIONS, ServiceStatus } from '../../types';
import { getStatusColor } from '../utils/statusColors';
import { ArrowLeft, Trash2, Download, Save, MessageSquare, Clock, CheckCircle, Image as ImageIcon, Upload, FileText, AlertTriangle, ShieldAlert, X, Edit2 } from 'lucide-react';
import jsPDF from 'jspdf';

const ServiceDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  
  // Estados de Edição
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingTechnical, setIsEditingTechnical] = useState(false);
  const [technicalData, setTechnicalData] = useState({ process: '', result: '' });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // State para deletar imagem (URL e se é a principal)
  const [imageToDelete, setImageToDelete] = useState<{ url: string; isMain: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchService();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data);
      setTechnicalData({
        process: data.process || '',
        result: data.result || ''
      });
    } catch (error) {
      console.error('Error fetching service:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: ServiceStatus) => {
    if (!service) return;
    
    let endDate = service.end_date;
    if (status === 'Concluído') {
      endDate = new Date().toISOString().split('T')[0];
    }

    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          status,
          end_date: endDate 
        })
        .eq('id', service.id);

      if (error) throw error;
      setService({ ...service, status, end_date: endDate });
      setIsEditingStatus(false);
    } catch (error) {
      alert('Erro ao atualizar status');
    }
  };

  const handleSaveTechnical = async () => {
    if (!service) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({
          process: technicalData.process,
          result: technicalData.result
        })
        .eq('id', service.id);

      if (error) throw error;

      setService({
        ...service,
        process: technicalData.process,
        result: technicalData.result
      });
      setIsEditingTechnical(false);
    } catch (error: any) {
      alert('Erro ao salvar detalhes técnicos: ' + error.message);
    }
  };

  const handleAddNote = async () => {
    if (!service || !newNote.trim()) return;
    const updatedNotes = [...(service.notes || []), newNote];
    try {
      const { error } = await supabase
        .from('services')
        .update({ notes: updatedNotes })
        .eq('id', service.id);

      if (error) throw error;
      setService({ ...service, notes: updatedNotes });
      setNewNote('');
    } catch (error) {
      alert('Erro ao adicionar nota');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !service) {
      return;
    }
    
    const files = Array.from(event.target.files);
    setUploadingImage(true);
    const newImageUrls: string[] = [];

    try {
      for (const file of files) {
        // Validação de tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`A imagem ${file.name} é muito grande (max 5MB). Pulada.`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${service.user_id}/${service.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('service-evidence')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('service-evidence')
          .getPublicUrl(fileName);

        // Cache busting na URL
        const publicUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
        newImageUrls.push(publicUrlWithCacheBust);
      }

      if (newImageUrls.length === 0) return;

      // Lógica: Se não tem foto principal, a primeira vira principal. 
      // As demais (ou todas se já tiver principal) vão para a galeria 'images'.
      
      let mainImage = service.image_url;
      const galleryImages = service.images || [];
      const imagesToAdd: string[] = [];

      newImageUrls.forEach((url, index) => {
        if (!mainImage && index === 0) {
          mainImage = url;
        } else {
          imagesToAdd.push(url);
        }
      });

      const updatedGallery = [...galleryImages, ...imagesToAdd];

      // Atualizar banco
      const { error: dbError } = await supabase
        .from('services')
        .update({ 
          image_url: mainImage,
          images: updatedGallery 
        })
        .eq('id', service.id);
        
      if (dbError) throw dbError;

      setService({ ...service, image_url: mainImage, images: updatedGallery });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error && typeof error === 'object') {
        errorMessage = error.message || error.error_description || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      if (errorMessage.includes('column "images" of relation "services" does not exist')) {
        alert('ATENÇÃO: Você precisa atualizar o banco de dados para suportar múltiplas fotos.\n\nVá no README.md do projeto, copie o código SQL da seção "NOVA FUNCIONALIDADE: GALERIA DE FOTOS" e rode no Supabase SQL Editor.');
      } else if (errorMessage.includes('Bucket not found') || errorMessage.includes('row-level security')) {
        alert(`ERRO DE PERMISSÃO.\nRode o script do README.md no Supabase.`);
      } else {
        alert(`Erro ao enviar imagem: ${errorMessage}`);
      }
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Abre o modal
  const handleRequestRemoveImage = (url: string, isMain: boolean) => {
    setImageToDelete({ url, isMain });
  };

  // Executa a exclusão após confirmação no modal
  const confirmImageDelete = async () => {
    if (!service || !imageToDelete) return;

    const { url: urlToRemove, isMain } = imageToDelete;

    try {
      let updatedMainImage = service.image_url;
      let updatedGallery = service.images || [];

      if (isMain) {
        // Se deletar a principal, tenta puxar a primeira da galeria para ser a nova principal
        if (updatedGallery.length > 0) {
          updatedMainImage = updatedGallery[0];
          updatedGallery = updatedGallery.slice(1);
        } else {
          updatedMainImage = null;
        }
      } else {
        // Remove da galeria
        updatedGallery = updatedGallery.filter(url => url !== urlToRemove);
      }

      const { error } = await supabase
        .from('services')
        .update({
          image_url: updatedMainImage,
          images: updatedGallery
        })
        .eq('id', service.id);

      if (error) throw error;

      setService({ ...service, image_url: updatedMainImage, images: updatedGallery });

    } catch (error: any) {
      alert(`Erro ao remover imagem: ${error.message}`);
    } finally {
      setImageToDelete(null); // Fecha o modal
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;

      const { data } = await supabase
        .from("services")
        .select("id")
        .eq("id", id);

      if (data && data.length > 0) {
        throw new Error(
          "O serviço não foi excluído. Motivo provável: user_id diferente."
        );
      }

      navigate("/");
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      alert(`Erro ao excluir serviço: ${msg}`);
      setShowDeleteModal(false);
    }
  };

  const handleExportTxt = () => {
    if (!service) return;
    const content = `
RELATÓRIO DE SERVIÇO - SERVICETRACK CLOUD
ID: ${service.id}
Nome: ${service.name}
Status: ${service.status}
Descrição: ${service.description}
Responsável: ${service.responsible}
Data Início: ${service.start_date}
Data Fim: ${service.end_date}

PROCESSO:
${service.process || 'N/ão informado'}

RESULTADO:
${service.result || 'Não informado'}

NOTAS:
${service.notes?.join('\n') || 'Nenhuma'}

FOTO PRINCIPAL: ${service.image_url || 'N/A'}
FOTOS EXTRAS: ${service.images?.length || 0}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `servico-${service.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper para baixar imagem e converter para Base64 para o PDF
  const getImageDataUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erro ao carregar imagem para PDF", error);
      return "";
    }
  };

  const handleExportPDF = async () => {
    if (!service) return;
    setGeneratingPdf(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = 20;

      // Helper para checar quebra de página
      const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // Helper para adicionar texto com quebra de linha
      const addWrappedText = (label: string, text: string | null) => {
        checkPageBreak(20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(text || "Não informado", pageWidth - (margin * 2));
        const textHeight = splitText.length * 5;
        
        checkPageBreak(textHeight);
        doc.text(splitText, margin, y);
        y += textHeight + 5;
      };

      // TÍTULO
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Serviço", margin, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, y);
      doc.setTextColor(0);
      y += 15;

      // DADOS PRINCIPAIS
      doc.setDrawColor(200);
      doc.line(margin, y - 5, pageWidth - margin, y - 5);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Serviço: ${service.name}`, margin, y);
      y += 7;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`ID: ${service.id}`, margin, y);
      y += 5;
      doc.text(`Status: ${service.status}`, margin, y);
      y += 5;
      doc.text(`Responsável: ${service.responsible}`, margin, y);
      y += 5;
      doc.text(`Início: ${service.start_date || '-'} | Término: ${service.end_date || '-'}`, margin, y);
      y += 10;

      doc.line(margin, y - 5, pageWidth - margin, y - 5);

      // DESCRIÇÃO
      addWrappedText("DESCRIÇÃO:", service.description);
      y += 5;

      // PROCESSO E RESULTADO
      addWrappedText("PROCESSO EXECUTADO:", service.process);
      addWrappedText("RESULTADO OBTIDO:", service.result);
      
      // NOTAS
      if (service.notes && service.notes.length > 0) {
        addWrappedText("NOTAS & OBSERVAÇÕES:", service.notes.join('\n'));
      }

      // IMAGENS
      const allImages = [];
      if (service.image_url) allImages.push({ url: service.image_url, title: "Foto Principal" });
      if (service.images) {
        service.images.forEach((url, i) => allImages.push({ url, title: `Galeria #${i + 1}` }));
      }

      if (allImages.length > 0) {
        checkPageBreak(40); // Espaço para o título da seção
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Evidências Fotográficas", margin, y);
        y += 10;

        for (const imgItem of allImages) {
          try {
            const base64Img = await getImageDataUrl(imgItem.url);
            if (base64Img) {
              // Determina dimensões para caber na página mantendo proporção (aproximada)
              // Assumindo landscape ou square para simplificar, largura max = pageWidth - 2*margin
              const imgWidth = pageWidth - (margin * 2);
              const imgHeight = imgWidth * 0.75; // Proporção 4:3 padrão

              checkPageBreak(imgHeight + 15);

              doc.setFontSize(10);
              doc.setFont("helvetica", "italic");
              doc.text(imgItem.title, margin, y);
              y += 3;

              doc.addImage(base64Img, "JPEG", margin, y, imgWidth, imgHeight);
              y += imgHeight + 10;
            }
          } catch (err) {
            console.error("Erro ao adicionar imagem ao PDF", err);
          }
        }
      }

      doc.save(`Relatorio_${service.name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
      console.error("Erro ao gerar PDF", error);
      alert("Ocorreu um erro ao gerar o PDF. Verifique o console.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!service) return null;

  const isOwner = currentUserId && service.user_id === currentUserId;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
             <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h1>
             <p className="text-sm text-gray-500 dark:text-gray-400">ID: {service.id.substring(0,8)}...</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportTxt} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
             <FileText className="w-4 h-4" /> TXT
           </button>
           <button 
             onClick={handleExportPDF} 
             disabled={generatingPdf}
             className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium disabled:opacity-50"
           >
             {generatingPdf ? (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
             ) : (
               <Download className="w-4 h-4" />
             )}
             PDF Completo
           </button>
           
           <div className="relative group">
             <button 
                onClick={() => setShowDeleteModal(true)} 
                disabled={!isOwner}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                  isOwner 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40' 
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed'
                }`}
             >
               <Trash2 className="w-4 h-4" /> Excluir
             </button>
           </div>
        </div>
      </div>
      
      {!isOwner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">Modo de Visualização (Restrito)</h4>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
              Este serviço pertence a outro ID de usuário. Edição limitada.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Descrição
            </h2>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{service.description || "Sem descrição."}</p>
          </div>

          {/* FOTOS / GALERIA */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Evidências & Fotos
              </h2>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden" 
                  accept="image/*"
                  multiple // Permite selecionar várias fotos
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Enviando...' : 'Adicionar Fotos'}
                </button>
              </div>
            </div>
            
            {uploadingImage && (
              <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500 text-sm">Processando imagens...</span>
              </div>
            )}

            {/* Foto Principal */}
            {service.image_url && (
               <div className="mb-6">
                   <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Foto Principal</h3>
                   <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group bg-gray-50 dark:bg-gray-900">
                     <img 
                        src={service.image_url} 
                        alt="Foto Principal" 
                        className="w-full h-auto max-h-[400px] object-contain"
                     />
                     <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <a 
                           href={service.image_url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90"
                           title="Abrir original"
                         >
                           <Download className="w-4 h-4" />
                         </a>
                         <button
                            onClick={() => handleRequestRemoveImage(service.image_url!, true)}
                            className="bg-red-600/90 text-white p-2 rounded-full hover:bg-red-700"
                            title="Remover foto principal"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                     </div>
                   </div>
               </div>
            )}

            {/* Galeria de Fotos Extras */}
            {service.images && service.images.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Galeria ({service.images.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {service.images.map((imgUrl, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <img 
                                    src={imgUrl} 
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                    alt={`Extra ${idx}`}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a 
                                        href={imgUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-white rounded-full text-gray-800 hover:bg-gray-100"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button 
                                        onClick={() => handleRequestRemoveImage(imgUrl, false)}
                                        className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!service.image_url && (!service.images || service.images.length === 0) && !uploadingImage && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <ImageIcon className="w-10 h-10 mb-2" />
                <span className="text-sm">Clique para adicionar fotos</span>
              </div>
            )}
          </div>

          {/* DETALHES TÉCNICOS (EDITÁVEL) */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Detalhes Técnicos
                </h2>
                {!isEditingTechnical && isOwner && (
                  <button 
                    onClick={() => setIsEditingTechnical(true)}
                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="Editar Detalhes"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
            </div>

            {isEditingTechnical ? (
               <div className="space-y-4 animate-fade-in">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Processo</label>
                   <textarea
                     className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                     rows={4}
                     value={technicalData.process}
                     onChange={(e) => setTechnicalData({...technicalData, process: e.target.value})}
                     placeholder="Descreva o processo realizado..."
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resultado</label>
                   <textarea
                     className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                     rows={4}
                     value={technicalData.result}
                     onChange={(e) => setTechnicalData({...technicalData, result: e.target.value})}
                     placeholder="Descreva o resultado obtido..."
                   />
                 </div>
                 <div className="flex gap-2 justify-end">
                   <button 
                     onClick={() => {
                        setIsEditingTechnical(false);
                        // Reverte alterações
                        setTechnicalData({ process: service.process || '', result: service.result || '' });
                     }}
                     className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleSaveTechnical}
                     className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                   >
                     <Save className="w-3 h-3" /> Salvar
                   </button>
                 </div>
               </div>
            ) : (
              <div className="space-y-4">
                 <div>
                   <h3 className="font-medium text-gray-900 dark:text-white">Processo</h3>
                   <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 whitespace-pre-wrap">{service.process || "Não informado."}</p>
                 </div>
                 <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                   <h3 className="font-medium text-gray-900 dark:text-white">Resultado</h3>
                   <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 whitespace-pre-wrap">{service.result || "Não informado."}</p>
                 </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
             <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Notas & Observações</h2>
             <div className="space-y-3 mb-4">
               {service.notes && service.notes.length > 0 ? (
                 service.notes.map((note, index) => (
                   <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm">
                     {note}
                   </div>
                 ))
               ) : (
                 <p className="text-gray-400 dark:text-gray-500 italic text-sm">Nenhuma nota adicionada.</p>
               )}
             </div>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newNote}
                 onChange={(e) => setNewNote(e.target.value)}
                 placeholder="Adicionar uma nota rápida..."
                 className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
               />
               <button onClick={handleAddNote} disabled={!newNote.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                 <Save className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

        {/* Sidebar Status Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 font-bold mb-4">Status do Projeto</h2>
            
            <div className="mb-6">
              {isEditingStatus ? (
                <div className="space-y-2">
                  <select 
                    value={service.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as ServiceStatus)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button onClick={() => setIsEditingStatus(false)} className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline">Cancelar</button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingStatus(true)}
                  className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(service.status)}`}
                >
                  {service.status}
                </div>
              )}
            </div>

            <div className="space-y-4">
               <div>
                 <span className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1"><Clock className="w-3 h-3 mr-1" /> Data de Início</span>
                 <p className="font-medium text-gray-800 dark:text-white">{service.start_date ? new Date(service.start_date).toLocaleDateString('pt-BR') : '—'}</p>
               </div>
               <div>
                 <span className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1"><Clock className="w-3 h-3 mr-1" /> Término</span>
                 <p className="font-medium text-gray-800 dark:text-white">{service.end_date ? new Date(service.end_date).toLocaleDateString('pt-BR') : '—'}</p>
               </div>
               <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                 <span className="block text-gray-500 dark:text-gray-400 text-xs mb-1">Responsável</span>
                 <p className="font-medium text-gray-800 dark:text-white">{service.responsible || '—'}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEBUG SECTION */}
      <div className="mt-12 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
         <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
           <AlertTriangle className="w-3 h-3" /> Info Admin
         </h5>
         <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-600 dark:text-gray-400">
            <div>
              <span className="block text-gray-400 dark:text-gray-500">User ID:</span>
              <span className="select-all">{currentUserId || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-gray-400 dark:text-gray-500">Service Owner:</span>
              <span className={`select-all ${isOwner ? 'text-green-600' : 'text-red-600'}`}>{service.user_id || 'NULL'}</span>
            </div>
         </div>
      </div>

      {/* MODAL: DELETE SERVICE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir Serviço?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Tem certeza que deseja excluir permanentemente?
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-600/20"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: DELETE IMAGE */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Remover Imagem?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Deseja remover esta imagem da galeria?
                    </p>
                    
                    {/* Preview da imagem a ser deletada */}
                    <div className="mb-6 w-full max-h-32 overflow-hidden rounded-lg bg-gray-100 flex justify-center">
                        <img src={imageToDelete.url} className="h-32 object-contain" alt="Preview delete" />
                    </div>

                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setImageToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmImageDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-600/20"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetails;