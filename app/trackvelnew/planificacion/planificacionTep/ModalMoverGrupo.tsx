import React, { useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { TbArrowsExchange, TbSearch, TbUsers } from 'react-icons/tb';

export interface GrupoDestino {
  uid: string;
  id: number;
  empresa: string;
  destinoGrupo: string;
  fecha: string;
  horaprog: string;
  ocupacion: number;
}

interface ModalMoverGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  grupos: GrupoDestino[];
  /** Grupos de los que provienen los pasajeros seleccionados: se marcan como
   *  origen para que no parezcan un destino válido. */
  uidsOrigen: string[];
  cantidadSeleccionada: number;
  onConfirmar: (uidDestino: string) => void;
}

/**
 * Hoy no existe ningún campo de cupo en los datos, así que ningún grupo se
 * bloquea. La comprobación vive aislada aquí para poder enchufarle un límite
 * real en cuanto la API lo exponga.
 */
const estaLleno = (_grupo: GrupoDestino) => false;

const formatearNombre = (texto: string) =>
  (texto || '')
    .toLowerCase()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');

export default function ModalMoverGrupo(props: ModalMoverGrupoProps) {
  if (!props.isOpen) return null;
  return <ModalMoverGrupoContenido {...props} />;
}

function ModalMoverGrupoContenido({
  isOpen,
  onClose,
  grupos,
  uidsOrigen,
  cantidadSeleccionada,
  onConfirmar,
}: ModalMoverGrupoProps) {
  const [busqueda, setBusqueda] = useState('');
  const [uidElegido, setUidElegido] = useState<string | null>(null);

  const origen = useMemo(() => new Set(uidsOrigen), [uidsOrigen]);

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return grupos;

    return grupos.filter((grupo) =>
      [
        String(grupo.id),
        grupo.empresa,
        grupo.destinoGrupo,
        grupo.horaprog,
        grupo.fecha,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termino),
    );
  }, [grupos, busqueda]);

  const confirmar = () => {
    if (!uidElegido) return;
    onConfirmar(uidElegido);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[15px] text-gray-800">
              <TbArrowsExchange size={20} />
              Mover {cantidadSeleccionada}{' '}
              {cantidadSeleccionada === 1 ? 'pasajero' : 'pasajeros'} a otro
              grupo
            </div>
            <span className="text-xs font-normal text-gray-500">
              Revisa la fecha y la hora programada del grupo destino antes de
              confirmar.
            </span>
          </ModalHeader>

          <ModalBody>
            <div className="relative">
              <TbSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                autoFocus
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por grupo, empresa, destino u hora…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {resultados.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Ningún grupo coincide con «{busqueda}».
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {resultados.map((grupo) => {
                  const esOrigen = origen.has(grupo.uid);
                  const lleno = estaLleno(grupo);
                  const deshabilitado = esOrigen || lleno;
                  const elegido = uidElegido === grupo.uid;

                  return (
                    <button
                      key={grupo.uid}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => setUidElegido(grupo.uid)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        elegido
                          ? 'border-blue-500 bg-blue-50'
                          : deshabilitado
                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                          Grupo {grupo.id}
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                            {formatearNombre(grupo.empresa)}
                          </span>
                          {esOrigen && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Origen
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-gray-500">
                          {formatearNombre(grupo.destinoGrupo)} ·{' '}
                          {grupo.horaprog && grupo.horaprog !== 'null'
                            ? grupo.horaprog
                            : 'Sin hora programada'}
                        </div>
                      </div>

                      <div className="ml-3 flex shrink-0 items-center gap-1 text-[12px] text-gray-600">
                        <TbUsers size={14} />
                        {grupo.ocupacion}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button color="danger" variant="light" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              isDisabled={!uidElegido}
              onPress={confirmar}
            >
              Mover aquí
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
}
