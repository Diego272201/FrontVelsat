'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocConductor {
  id: number;
  codtaxi: number;
  tipo_documento: string;
  archivo_url: string;
  fecha_vencimiento: string;
  observaciones: string;
  estado: string;
  usuario: string;
}

interface DocUnidad {
  id: number;
  deviceID: string;
  tipo_documento: string;
  archivo_url: string;
  fecha_vencimiento: string;
  observaciones: string;
  estado: string;
  usuario: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDaysUntil = (fechaVencimiento: string): number => {
  const today = new Date();
  const expiry = new Date(fechaVencimiento);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const formatDate = (fechaVencimiento: string): string => {
  const date = new Date(fechaVencimiento);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ─── Single Alert Card ────────────────────────────────────────────────────────
const AlertCard = ({
  title,
  subtitle,
  estado,
  fechaVencimiento,
  index,
}: {
  title: string;
  subtitle: string;
  estado: string;
  fechaVencimiento: string;
  index: number;
}) => {
  const days = getDaysUntil(fechaVencimiento);
  const isExpired = estado === 'Vencido' || days < 0;

  return (
    <div
      className="alert-card"
      style={{
        animationDelay: `${index * 80}ms`,
        background: isExpired
          ? 'linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(255,255,255,0.98) 100%)'
          : 'linear-gradient(135deg, rgba(255,251,235,0.95) 0%, rgba(255,255,255,0.98) 100%)',
        borderLeft: `3px solid ${isExpired ? '#ef4444' : '#f59e0b'}`,
        borderRadius: '10px',
        padding: '10px 12px',
        marginBottom: '6px',
        boxShadow: isExpired
          ? '0 2px 12px rgba(239,68,68,0.12)'
          : '0 2px 12px rgba(245,158,11,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'transform 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = 'translateX(-2px)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(0)')}
    >
      {/* Icono estado */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: isExpired
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isExpired
            ? '0 3px 8px rgba(239,68,68,0.35)'
            : '0 3px 8px rgba(245,158,11,0.35)',
        }}
      >
        {isExpired ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '0.01em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#64748b',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '3px',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: '600',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Vence: {formatDate(fechaVencimiento)}
          </span>
        </div>
      </div>

      {/* Badge días */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          background: isExpired ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${isExpired ? '#fecaca' : '#fde68a'}`,
          borderRadius: '8px',
          padding: '4px 8px',
          minWidth: '48px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: '800',
            color: isExpired ? '#ef4444' : '#f59e0b',
            lineHeight: 1,
          }}
        >
          {isExpired ? Math.abs(days) : days}
        </div>
        <div
          style={{
            fontSize: '8px',
            fontWeight: '600',
            color: isExpired ? '#f87171' : '#fbbf24',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginTop: '2px',
          }}
        >
          {isExpired ? 'días atrás' : 'días'}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const ExpiryAlerts = () => {
  const { data: session, status } = useSession();

  const [conductorDocs, setConductorDocs] = useState<DocConductor[]>([]);
  const [unidadDocs, setUnidadDocs] = useState<DocUnidad[]>([]);
  const [conductorNames, setConductorNames] = useState<Record<number, string>>(
    {},
  );
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'conductor' | 'unidad'>(
    'conductor',
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchConductorNames = useCallback(async (docs: DocConductor[]) => {
    const results = await Promise.allSettled(
      docs.map((doc) =>
        axios.get(
          `https://do.velsat.pe:2083/api/Doc/detalleConductor/${doc.codtaxi}`,
        ),
      ),
    );

    const names: Record<number, string> = {};
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        const { apepate, nombre } = res.value.data;
        const fullName = `${apepate ?? ''} ${nombre ?? ''}`.trim();
        names[docs[i].codtaxi] = fullName || `Taxi #${docs[i].codtaxi}`;
      } else {
        names[docs[i].codtaxi] = `Taxi #${docs[i].codtaxi}`;
      }
    });

    setConductorNames(names);
  }, []);

  const fetchDocsPorVencer = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.username) return;
    const username = session.user.username;

    const [conductorRes, unidadRes] = await Promise.allSettled([
      axios.get(
        `https://do.velsat.pe:2083/api/Doc/GetDocCondcutorPorVencer?usuario=${username}`,
      ),
      axios.get(
        `https://do.velsat.pe:2083/api/Doc/GetDocUnidadPorVencer?usuario=${username}`,
      ),
    ]);

    if (conductorRes.status === 'fulfilled') {
      const data = conductorRes.value.data?.data ?? [];
      setConductorDocs(data);
      await fetchConductorNames(data);
    }

    if (unidadRes.status === 'fulfilled') {
      const data = unidadRes.value.data?.data ?? [];
      setUnidadDocs(data);
    }

    setIsLoaded(true);
  }, [session?.user?.username, status, fetchConductorNames]);

  useEffect(() => {
    fetchDocsPorVencer();
  }, [fetchDocsPorVencer]);

  const totalAlerts = conductorDocs.length + unidadDocs.length;

  // No renderizar si no hay datos
  if (!isLoaded || totalAlerts === 0 || !isVisible) return null;

  const conductorExpired = conductorDocs.filter(
    (d) => d.estado === 'Vencido',
  ).length;
  const unidadExpired = unidadDocs.filter((d) => d.estado === 'Vencido').length;
  const totalExpired = conductorExpired + unidadExpired;

  const activeList = activeTab === 'conductor' ? conductorDocs : unidadDocs;

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.6; transform: scale(1.3); }
        }
        .expiry-panel {
          animation: slideInUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .alert-card {
          animation: cardIn 0.3s ease both;
        }
        .tab-btn {
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.15) !important;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.2) !important;
        }
        .minimize-btn:hover {
          background: rgba(255,255,255,0.2) !important;
        }
        .scroll-area::-webkit-scrollbar {
          width: 3px;
        }
        .scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-area::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

      <div
        className="expiry-panel"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 9998,
          width: '300px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1)',
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Icono + titulo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background:
                  totalExpired > 0
                    ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                    : 'linear-gradient(135deg, #f59e0b, #b45309)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  totalExpired > 0
                    ? '0 4px 12px rgba(239,68,68,0.4)'
                    : '0 4px 12px rgba(245,158,11,0.4)',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                  letterSpacing: '0.02em',
                }}
              >
                Alertas de Vencimiento
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {totalAlerts} documento{totalAlerts !== 1 ? 's' : ''} por
                atender
              </div>
            </div>
          </div>

          {/* Badge total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {totalExpired > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: '800',
                  borderRadius: '20px',
                  padding: '2px 7px',
                  letterSpacing: '0.03em',
                }}
              >
                {totalExpired} venc.
              </span>
            )}

            {/* Punto pulsante */}
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: totalExpired > 0 ? '#ef4444' : '#f59e0b',
                animation: 'pulse-dot 1.8s ease-in-out infinite',
              }}
            />
          </div>

          {/* Botones acción */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="minimize-btn"
              onClick={() => setIsMinimized((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                padding: 0,
              }}
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>
            <button
              className="close-btn"
              onClick={() => setIsVisible(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                padding: 0,
              }}
              title="Cerrar"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs + Body ── */}
        {!isMinimized && (
          <>
            {/* Tabs */}
            <div
              style={{
                background: '#1e293b',
                padding: '0 14px 10px',
                display: 'flex',
                gap: '6px',
              }}
            >
              {(
                [
                  {
                    key: 'conductor',
                    label: 'Conductores',
                    count: conductorDocs.length,
                    expired: conductorExpired,
                  },
                  {
                    key: 'unidad',
                    label: 'Unidades',
                    count: unidadDocs.length,
                    expired: unidadExpired,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  className="tab-btn"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      activeTab === tab.key
                        ? 'rgba(255,255,255,0.12)'
                        : 'transparent',
                    color: activeTab === tab.key ? '#f1f5f9' : '#64748b',
                    fontSize: '10px',
                    fontWeight: activeTab === tab.key ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      background: tab.expired > 0 ? '#ef4444' : '#475569',
                      color: 'white',
                      fontSize: '8px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      padding: '1px 5px',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Lista */}
            <div
              className="scroll-area"
              style={{
                background: '#f8fafc',
                padding: '10px 10px 6px',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {activeList.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 0',
                    color: '#94a3b8',
                    fontSize: '11px',
                  }}
                >
                  Sin alertas en esta categoría
                </div>
              ) : (
                activeList.map((doc, i) => (
                  <AlertCard
                    key={doc.id}
                    title={doc.tipo_documento}
                    subtitle={
                      activeTab === 'conductor'
                        ? `Conductor ${conductorNames[(doc as DocConductor).codtaxi] ?? (doc as DocConductor).codtaxi}`
                        : `Unidad: ${(doc as DocUnidad).deviceID}`
                    }
                    estado={doc.estado}
                    fechaVencimiento={doc.fecha_vencimiento}
                    index={i}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Actualizado al cargar
              </span>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                <span
                  style={{
                    fontSize: '9px',
                    color: '#64748b',
                    fontWeight: '600',
                  }}
                >
                  En vivo
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ExpiryAlerts;
