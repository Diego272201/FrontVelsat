'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronUp, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const SHARE_API = 'https://do.velsat.pe:2083/api/Preplan/Generarlink';
const DEFAULT_HOURS = 4;
const MAX_HOURS = 24;

interface ShareUnitDrawerProps {
  deviceId: string | null;
  username: string;
  onClose: () => void;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildToken(deviceId: string): string {
  const devicePart = deviceId.substring(0, 4).replace(/[^a-zA-Z0-9]/g, '');
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${devicePart}-${Date.now()}-${randomPart}`;
}

export default function ShareUnitDrawer({
  deviceId,
  username,
  onClose,
}: ShareUnitDrawerProps) {
  const isOpen = deviceId !== null;
  const [visibleDeviceId, setVisibleDeviceId] = useState<string | null>(deviceId);
  const [expiration, setExpiration] = useState('');
  const [link, setLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    setVisibleDeviceId(deviceId);
    setExpiration(
      toLocalInputValue(new Date(Date.now() + DEFAULT_HOURS * 60 * 60 * 1000)),
    );
    setLink('');
    setSectionOpen(true);
  }, [deviceId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const limits = useMemo(() => {
    const now = new Date();
    return {
      min: toLocalInputValue(new Date(now.getTime() + 60 * 1000)),
      max: toLocalInputValue(new Date(now.getTime() + MAX_HOURS * 60 * 60 * 1000)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const handleGenerate = async () => {
    if (!visibleDeviceId || !username) {
      toast.error('No hay datos del dispositivo');
      return;
    }

    const minutes = Math.round((new Date(expiration).getTime() - Date.now()) / 60000);
    if (!Number.isFinite(minutes) || minutes < 1) {
      toast.error('La caducidad debe ser una fecha futura');
      return;
    }
    if (minutes > MAX_HOURS * 60) {
      toast.error(`La caducidad máxima es de ${MAX_HOURS} horas`);
      return;
    }

    setIsGenerating(true);
    try {
      const token = buildToken(visibleDeviceId);
      const response = await fetch(SHARE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceId: visibleDeviceId,
          username,
          duracionMinutos: minutes,
        }),
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      setLink(`${window.location.origin}/trackvelnew/seguimientounidad?token=${token}`);
    } catch {
      toast.error('Error generando el enlace de seguimiento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const fieldLabel =
    'pointer-events-none absolute -top-[7px] left-2.5 bg-white px-1 text-[11px] font-medium text-slate-500';
  const fieldInput =
    'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-[#113EB9] focus:ring-1 focus:ring-[#113EB9]';

  return (
    <div
      className={`fixed inset-0 z-[1100] ${isOpen ? '' : 'pointer-events-none'}`}
      style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-label="Compartir unidad"
        className={`absolute bottom-0 right-0 top-[36px] flex w-[440px] max-w-full flex-col bg-white transition-[transform,box-shadow] duration-300 ease-out ${
          isOpen
            ? 'translate-x-0 shadow-[-12px_0_32px_rgba(15,23,42,0.18)]'
            : 'translate-x-full shadow-none'
        }`}
      >
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4">
          <button
            type="button"
            onClick={onClose}
            title="Volver"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[16px] font-semibold text-slate-900">Compartir</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSectionOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[13px] font-semibold text-slate-800">
                Obligatorio
              </span>
              <ChevronUp
                size={16}
                className={`text-slate-500 transition-transform ${sectionOpen ? '' : 'rotate-180'}`}
              />
            </button>

            {sectionOpen && (
              <div className="space-y-4 px-4 pb-4 pt-2">
                <div className="relative">
                  <span className={fieldLabel}>Dispositivo</span>
                  <input
                    type="text"
                    readOnly
                    value={visibleDeviceId?.toUpperCase() ?? ''}
                    className={`${fieldInput} bg-slate-50 text-slate-500`}
                  />
                </div>

                <div className="relative">
                  <span className={fieldLabel}>Caducidad</span>
                  <input
                    type="datetime-local"
                    value={expiration}
                    min={limits.min}
                    max={limits.max}
                    onChange={(e) => {
                      setExpiration(e.target.value);
                      setLink('');
                    }}
                    className={fieldInput}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Máximo {MAX_HOURS} horas desde ahora
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !expiration}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#113EB9] text-[12.5px] font-semibold uppercase tracking-wide text-[#113EB9] transition-colors hover:bg-[#113EB9]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#113EB9] border-t-transparent" />
                  ) : (
                    <Link2 size={15} />
                  )}
                  Mostrar
                </button>

                <div className="relative">
                  {link && <span className={fieldLabel}>Enlace</span>}
                  <input
                    type="text"
                    readOnly
                    value={link}
                    placeholder="Enlace"
                    onFocus={(e) => e.target.select()}
                    className={`${fieldInput} bg-slate-50 placeholder:text-slate-400`}
                  />
                </div>
              </div>
            )}
          </section>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 min-w-[130px] rounded-md border border-slate-300 px-4 text-[12.5px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!link}
              className="h-10 min-w-[130px] rounded-md bg-[#113EB9] px-4 text-[12.5px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0d32a0] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Copiar
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
