'use client';
import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Eliminar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onCancel} aria-hidden />

      <div className="relative w-full max-w-[380px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-gray-800">{title}</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-50 px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-1.5 text-[12px] font-bold text-white transition hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
