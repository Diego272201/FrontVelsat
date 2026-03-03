'use client';
import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, Download, Edit2, FileText, Truck, User, Calendar, X, Upload, ChevronRight, ChevronDown, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@nextui-org/react';

interface Document {
  id: string;
  type: string;
  expiryDate?: string;
  base64: string;
  fileName: string;
  cloudflareImageId?: string;
  cloudflareImageUrl?: string;
}

interface Unit {
  id: string;
  plate: string;
  documents: Document[];
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'prompt' | 'alert';
  onConfirm?: (value?: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  placeholder?: string;
}

const DRIVER_DOC_TYPES = ['Licencia de conducir','DNI/Cédula','Antecedentes penales','Certificado médico','Otros'];
const UNIT_DOC_TYPES = ['Revisión técnica','SOAT','Tarjeta de propiedad','Permiso de circulación','Otros'];

// ── Modal genérico ─────────────────────────────────────────────────────────────
const GenericModal: React.FC<{ config: ModalConfig; onClose: () => void }> = ({ config, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  if (!config.isOpen) return null;

  const handleConfirm = () => {
    config.onConfirm?.(config.type === 'prompt' ? inputValue : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 p-2.5 rounded-xl ${config.confirmVariant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              {config.confirmVariant === 'danger' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm mb-1">{config.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{config.message}</p>
              {config.type === 'prompt' && (
                <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inputValue.trim()) handleConfirm(); }}
                  placeholder={config.placeholder || ''}
                  className="mt-3 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              )}
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          {config.type !== 'alert' && (
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
              {config.cancelLabel || 'Cancelar'}
            </button>
          )}
          <button onClick={handleConfirm} disabled={config.type === 'prompt' && !inputValue.trim()}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${config.confirmVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {config.confirmLabel || 'Aceptar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Document Card ──────────────────────────────────────────────────────────────
const DocumentCard: React.FC<{
  doc: Document;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
  isDeleting?: boolean;
}> = ({ doc, onEdit, onDelete, onDownload, isDeleting }) => {
  const displayUrl = doc.cloudflareImageUrl || doc.base64;
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200 flex flex-col h-full transition-shadow duration-300 relative">
      {/* Overlay spinner al eliminar */}
      {isDeleting && (
        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-xl">
                <Spinner color="danger" />

          <p className="text-[10px] font-bold text-rose-500">Eliminando...</p>
        </div>
      )}
      <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden group">
        <img src={displayUrl} alt={doc.type} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={onDownload} className="p-2 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-lg transition-all transform hover:scale-110"><Download size={16} /></button>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1.5">
          <h4 className="font-bold text-slate-900 text-xs leading-tight line-clamp-2">{doc.type}</h4>
          <div className="p-1 bg-slate-100 rounded text-slate-400 shrink-0 ml-2"><FileText size={12} /></div>
        </div>
        {doc.expiryDate && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mb-3">
            <Calendar size={10} className="text-slate-400" /><span>Vence: {doc.expiryDate}</span>
          </div>
        )}
        {doc.cloudflareImageId && (
          <div className="flex items-center gap-1 text-[10px] text-slate-300 mb-1">
            <span>☁ Cloudflare</span>
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
          <button onClick={onEdit} disabled={isDeleting} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-40"><Edit2 size={12} />Editar</button>
          <button onClick={onDelete} disabled={isDeleting} className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-40">
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Eliminar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Selector de tipo con opción "Otro (escribir)" ──────────────────────────────
const DocTypeSelector: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__custom__') {
      setShowCustom(true);
      setCustomValue('');
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={showCustom ? '__custom__' : value}
        onChange={handleSelect}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
      >
        {options.map(type => <option key={type} value={type}>{type}</option>)}
        <option value="__custom__"> Escribir tipo personalizado...</option>
      </select>
      {showCustom && (
        <input
          autoFocus
          type="text"
          value={customValue}
          onChange={e => { setCustomValue(e.target.value); onChange(e.target.value); }}
          placeholder="Ej: Seguro vehicular, Permiso especial..."
          className="w-full bg-slate-50 border border-blue-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      )}
    </div>
  );
};

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [driverName] = useState('Colocar el username');
  const [driverDocs, setDriverDocs] = useState<Document[]>([]);
  const [units, setUnits] = useState<Unit[]>([{ id: '1', plate: 'ABC-123', documents: [] }]);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({ '1': true });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalTarget, setModalTarget] = useState<'driver' | 'unit'>('driver');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [formDocType, setFormDocType] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFile, setFormFile] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState('');
  const [formRawFile, setFormRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Track which doc IDs are being deleted
  const [deletingDocIds, setDeletingDocIds] = useState<Set<string>>(new Set());

  const [genericModal, setGenericModal] = useState<ModalConfig>({ isOpen: false, title: '', message: '', type: 'confirm' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Cloudflare ─────────────────────────────────────────────────────────────

  const uploadToCloudflare = async (file: File): Promise<{ id: string; url: string } | null> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(
        '/trackvelnew/gestionconductores/gestiondocs/api/upload-image',
        { method: 'POST', body: formData }
      );
      const result = await response.json();
      if (result.success) return { id: result.imageId, url: result.imageUrl };
      return null;
    } catch {
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFromCloudflare = async (imageId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        '/trackvelnew/gestionconductores/gestiondocs/api/delete-image',
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId }) }
      );
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  };

  // ── Modales genéricos ──────────────────────────────────────────────────────

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setGenericModal({ isOpen: true, title, message, type: 'confirm', onConfirm, confirmVariant: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' });
  };
  const showPrompt = (title: string, message: string, placeholder: string, onConfirm: (v: string) => void) => {
    setGenericModal({ isOpen: true, title, message, type: 'prompt', placeholder, onConfirm: (v) => v && onConfirm(v), confirmLabel: 'Agregar', cancelLabel: 'Cancelar', confirmVariant: 'primary' });
  };
  const closeGenericModal = () => setGenericModal(prev => ({ ...prev, isOpen: false }));

  // ── Archivo ────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormRawFile(file);
      setFormFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setFormFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Abrir modales de documento ─────────────────────────────────────────────

  const openAddModal = (target: 'driver' | 'unit', unitId: string | null = null) => {
    setModalMode('add'); setModalTarget(target); setActiveUnitId(unitId); setEditingDocId(null);
    setFormDocType(target === 'driver' ? DRIVER_DOC_TYPES[0] : UNIT_DOC_TYPES[0]);
    setFormExpiryDate(''); setFormFile(null); setFormFileName(''); setFormRawFile(null);
    setIsDocModalOpen(true);
  };

  const openEditModal = (target: 'driver' | 'unit', doc: Document, unitId: string | null = null) => {
    setModalMode('edit'); setModalTarget(target); setActiveUnitId(unitId); setEditingDocId(doc.id);
    setFormDocType(doc.type); setFormExpiryDate(doc.expiryDate || '');
    setFormFile(doc.cloudflareImageUrl || doc.base64); setFormFileName(doc.fileName);
    setFormRawFile(null);
    setIsDocModalOpen(true);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────

  const saveDocument = async () => {
    if (!formFile || !formDocType) return;

    let cloudflareImageId: string | undefined;
    let cloudflareImageUrl: string | undefined;

    if (formRawFile) {
      const cfResult = await uploadToCloudflare(formRawFile);
      if (cfResult) {
        cloudflareImageId = cfResult.id;
        cloudflareImageUrl = cfResult.url;
      }
    }

    // Si es edición, conservar el cloudflare anterior si no se cambió la imagen
    if (modalMode === 'edit' && !formRawFile) {
      const existingDoc = modalTarget === 'driver'
        ? driverDocs.find(d => d.id === editingDocId)
        : units.find(u => u.id === activeUnitId)?.documents.find(d => d.id === editingDocId);
      cloudflareImageId = existingDoc?.cloudflareImageId;
      cloudflareImageUrl = existingDoc?.cloudflareImageUrl;
    }

    const newDoc: Document = {
      id: editingDocId || Math.random().toString(36).substr(2, 9),
      type: formDocType,
      expiryDate: formExpiryDate,
      base64: formFile,
      fileName: formFileName,
      cloudflareImageId,
      cloudflareImageUrl,
    };

    if (modalTarget === 'driver') {
      setDriverDocs(modalMode === 'add' ? [...driverDocs, newDoc] : driverDocs.map(d => d.id === editingDocId ? newDoc : d));
    } else if (modalTarget === 'unit' && activeUnitId) {
      setUnits(units.map(u => u.id !== activeUnitId ? u : {
        ...u,
        documents: modalMode === 'add' ? [...u.documents, newDoc] : u.documents.map(d => d.id === editingDocId ? newDoc : d)
      }));
    }
    setIsDocModalOpen(false);
  };

  // ── Eliminar documento (con spinner en la card) ────────────────────────────

  const deleteDocument = (target: 'driver' | 'unit', docId: string, unitId: string | null = null) => {
    const findDoc = (): Document | undefined => {
      if (target === 'driver') return driverDocs.find(d => d.id === docId);
      return units.find(u => u.id === unitId)?.documents.find(d => d.id === docId);
    };
    const doc = findDoc();

    showConfirm('Eliminar documento', '¿Estás seguro? Esta acción no se puede deshacer.', async () => {
      setDeletingDocIds(prev => new Set(prev).add(docId));
      if (doc?.cloudflareImageId) await deleteFromCloudflare(doc.cloudflareImageId);
      if (target === 'driver') setDriverDocs(prev => prev.filter(d => d.id !== docId));
      else if (target === 'unit' && unitId) setUnits(prev => prev.map(u => u.id === unitId ? { ...u, documents: u.documents.filter(d => d.id !== docId) } : u));
      setDeletingDocIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    });
  };

  const downloadDocument = (doc: Document) => {
    const url = doc.cloudflareImageUrl || doc.base64;
    const link = document.createElement('a');
    link.href = url; link.download = `${doc.type}_${doc.fileName}`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const addUnit = () => {
    showPrompt('Nueva Unidad', 'Ingrese el código o placa de la nueva unidad:', 'Ej: XYZ-456', (plate) => {
      const newId = Math.random().toString(36).substr(2, 9);
      setUnits(prev => [...prev, { id: newId, plate, documents: [] }]);
      setExpandedUnits(prev => ({ ...prev, [newId]: true }));
    });
  };

  const deleteUnit = (unitId: string) => {
    showConfirm('Eliminar unidad', '¿Eliminar esta unidad y todos sus documentos?', async () => {
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        await Promise.all(unit.documents.filter(d => d.cloudflareImageId).map(d => deleteFromCloudflare(d.cloudflareImageId!)));
      }
      setUnits(prev => prev.filter(u => u.id !== unitId));
    });
  };

  const toggleUnit = (unitId: string) => setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" style={{ overflow: 'hidden' }}>

      <header className="shrink-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <FileText className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Mis Documentos</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">Bienvenido, <span className="text-slate-900 font-bold">{driverName}</span></span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600"><User size={16} /></div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

          {/* Conductor */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><User size={22} /></div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Conductor</h2>
                  <p className="text-xs font-medium text-slate-400">Identificación y licencias personales</p>
                </div>
              </div>
              <button onClick={() => openAddModal('driver')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-100 active:scale-95">
                <Plus size={16} />Agregar Documento
              </button>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              {driverDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {driverDocs.map(doc => (
                      <DocumentCard key={doc.id} doc={doc}
                        isDeleting={deletingDocIds.has(doc.id)}
                        onEdit={() => openEditModal('driver', doc)}
                        onDelete={() => deleteDocument('driver', doc.id)}
                        onDownload={() => downloadDocument(doc)} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300 space-y-3">
                  <div className="p-4 bg-slate-50 rounded-full"><FileText size={40} strokeWidth={1} /></div>
                  <p className="text-sm font-medium">No hay documentos registrados</p>
                  <button onClick={() => openAddModal('driver')} className="text-blue-600 text-xs font-bold hover:underline">Subir el primero</button>
                </div>
              )}
            </div>
          </section>

          {/* Unidades */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600"><Truck size={22} /></div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Unidades</h2>
                  <p className="text-xs font-medium text-slate-400">Documentación técnica de su flota</p>
                </div>
              </div>
              <button onClick={addUnit} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-slate-200 active:scale-95">
                <Plus size={16} />Nueva Unidad
              </button>
            </div>
            <div className="space-y-5">
              {units.length > 0 ? units.map(unit => (
                <div key={unit.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                  <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleUnit(unit.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600"><Truck size={20} /></div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900">Placa: <span className="text-orange-600">{unit.plate}</span></h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit.documents.length} documentos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={e => { e.stopPropagation(); deleteUnit(unit.id); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                      <div className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        {expandedUnits[unit.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedUnits[unit.id] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-6 pt-0 border-t border-slate-100">
                          <div className="flex justify-end mb-6 mt-4">
                            <button onClick={() => openAddModal('unit', unit.id)} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                              <Plus size={14} />Agregar Documento
                            </button>
                          </div>
                          {unit.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                              {unit.documents.map(doc => (
                                <DocumentCard key={doc.id} doc={doc}
                                  isDeleting={deletingDocIds.has(doc.id)}
                                  onEdit={() => openEditModal('unit', doc, unit.id)}
                                  onDelete={() => deleteDocument('unit', doc.id, unit.id)}
                                  onDownload={() => downloadDocument(doc)} />
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-300 space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <FileText size={32} strokeWidth={1} />
                              <p className="text-xs font-medium">Sin documentos para esta unidad</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )) : (
                <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400 space-y-5 border border-dashed border-slate-300">
                  <div className="p-5 bg-slate-50 rounded-full"><Truck size={56} strokeWidth={1} /></div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-bold text-slate-900">No hay unidades registradas</p>
                    <p className="text-xs">Agregue su primera unidad para gestionar su documentación</p>
                  </div>
                  <button onClick={addUnit} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-slate-200">Agregar Unidad</button>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* ── Modal documento ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isUploading && setIsDocModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900">{modalMode === 'add' ? 'Nuevo Documento' : 'Editar Documento'}</h3>
                <button onClick={() => !isUploading && setIsDocModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5">

                {/* Tipo de documento con opción personalizada */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo de Documento</label>
                  <DocTypeSelector
                    value={formDocType}
                    onChange={setFormDocType}
                    options={modalTarget === 'driver' ? DRIVER_DOC_TYPES : UNIT_DOC_TYPES}
                  />
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha de Vencimiento <span className="text-slate-300 normal-case font-normal">(opcional)</span></label>
                  <input type="date" value={formExpiryDate} onChange={e => setFormExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                {/* Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Archivo / Imagen</label>
                  <div onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all ${formFile ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                    {/* Overlay de carga sobre la zona de upload */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/90 rounded-xl flex flex-col items-center justify-center gap-3 z-10">
                        <div className="relative w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                            <circle cx="28" cy="28" r="24" fill="none" stroke="#3b82f6" strokeWidth="4"
                              strokeDasharray="150.8" strokeDashoffset="37.7"
                              className="transition-all duration-300" style={{ strokeLinecap: 'round' }} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                                  <Spinner color="primary" />

                          </div>
                        </div>
                        <p className="text-xs font-bold text-blue-700">Subiendo a Cloudflare...</p>
                        <p className="text-[10px] text-slate-400">Por favor espera</p>
                      </div>
                    )}

                    {formFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                          <img src={formFile} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-blue-600">¡Imagen cargada!</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px] font-medium">{formFileName}</p>
                        </div>
                        {!isUploading && (
                          <button onClick={e => { e.stopPropagation(); setFormFile(null); setFormFileName(''); setFormRawFile(null); }}
                            className="px-3 py-1 bg-white border border-rose-100 text-[10px] font-bold text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                            Cambiar archivo
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><Upload size={22} /></div>
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">Seleccionar imagen</p>
                          <p className="text-[10px] text-slate-400 font-medium">PNG, JPG o JPEG (Máx. 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button onClick={() => !isUploading && setIsDocModalOpen(false)} disabled={isUploading}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={saveDocument} disabled={!formFile || !formDocType || isUploading}
                  className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                  {isUploading ? <><Loader2 size={14} className="animate-spin" />Subiendo...</> : (modalMode === 'add' ? 'Guardar' : 'Actualizar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal genérico */}
      <AnimatePresence>
        {genericModal.isOpen && <GenericModal config={genericModal} onClose={closeGenericModal} />}
      </AnimatePresence>
    </div>
  );
}