import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import BaseModal from '@/app/components/ui/BaseModal';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { MdLibraryAdd, MdDelete } from 'react-icons/md';
import { toast } from 'sonner';
import { useUsername } from '@/hooks/useUsername';
import InputPasajeroEmpresa from '@/app/components/inputs/InputPasajeroEmpresa';
import InputPasajero from '@/app/components/inputs/InputPasajero';

interface Grupo {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  destinocodigo?: string;
  fecha: string;
  horaprog: string;
  conductor: string;

  unidad: string;
  cantidadPasajeros?: number;
}

interface Pasajero {
  apepate: string;
  codlan: string;
  codlugar: number;
  codigo?: string;
  destinocodigo?: string;
  codcliente?: string;
  hora?: string;
}

interface ModalAgregarPasajeroProps {
  grupo: Grupo;
  onRefrescarDatos?: () => void;
  usarApiTalma?: boolean;
}

// Uno por grupo: solo el botón permanece montado, el contenido del modal
// se monta al abrirlo y se desmonta al cerrarlo.
export default function App(props: ModalAgregarPasajeroProps) {
  const [montado, setMontado] = useState(false);

  return (
    <>
      <button
        onClick={() => setMontado(true)}
        type="button"
        className="inline-flex h-8 items-center gap-x-2 rounded border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus size={14} />
        Pasajero
      </button>

      {montado && (
        <AppContenido {...props} onDesmontar={() => setMontado(false)} />
      )}
    </>
  );
}

function AppContenido({
  grupo,
  onRefrescarDatos,
  usarApiTalma = false,
  onDesmontar,
}: ModalAgregarPasajeroProps & { onDesmontar: () => void }) {
  const { username, isReady } = useUsername();
  // Se monta ya abierto; al cerrarse se desmonta por completo.
  const [isOpen, setIsOpen] = useState(true);
  const onOpenChange = () => {
    setIsOpen(false);
    onDesmontar();
  };
  const [pasajeroSeleccionado, setPasajeroSeleccionado] =
    useState<Pasajero | null>(null);
  const [pasajerosSeleccionados, setPasajerosSeleccionados] = useState<
    Pasajero[]
  >([]);
  const [agregandoPasajeros, setAgregandoPasajeros] = useState(false);

  const handleSeleccionarPasajero = (pasajero: Pasajero) => {
    if (!pasajero) return;

    const yaExiste = pasajerosSeleccionados.some(
      (p) => p.codlan === pasajero.codlan,
    );

    if (yaExiste) {
      toast.warning('Este pasajero ya está en la lista');
      return;
    }

    setPasajerosSeleccionados([...pasajerosSeleccionados, pasajero]);
    setPasajeroSeleccionado(null);
    toast.success('Pasajero agregado a la lista');
  };

  const handleEliminarPendiente = (codlan: string) => {
    setPasajerosSeleccionados(
      pasajerosSeleccionados.filter((p) => p.codlan !== codlan),
    );
    toast.success('Pasajero eliminado de la lista');
  };

  // Función para convertir formato ISO a DD/MM/YYYY HH:mm
  const formatearFechaHoraParaAPI = (
    fechaISO: string,
  ): { fecha: string; hora: string } => {
    const date = new Date(fechaISO);

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');

    return {
      fecha: `${dia}/${mes}/${año}`,
      hora: `${horas}:${minutos}`,
    };
  };

  // Función para formatear horaprog en formato DD/MM/YYYY HH:mm
  const formatearHoraProg = (fechaISO: string): string => {
    const date = new Date(fechaISO);

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  };

  const handleAgregarTodos = async () => {
    if (!isReady) {
      return;
    }

    if (pasajerosSeleccionados.length === 0) {
      toast.warning('No hay pasajeros para agregar');
      return;
    }

    setAgregandoPasajeros(true);

    try {
      if (usarApiTalma) {
        // Lógica para API de Talma
        let fechaFinal: string;
        let horaFinal: string;
        let horaprogFinal: string;

        if (grupo.tipo === 'S') {
          // SALIDA: fecha viene en grupo.fecha, horaprog viene en grupo.horaprog
          const datosFecha = formatearFechaHoraParaAPI(grupo.fecha);
          fechaFinal = datosFecha.fecha;
          horaFinal = datosFecha.hora;
          horaprogFinal = grupo.horaprog
            ? formatearHoraProg(grupo.horaprog)
            : '';
        } else {
          // ENTRADA (tipo 'I'): horaprog viene en grupo.horaprog y se desestructura en fecha/hora
          const datosHoraProg = formatearFechaHoraParaAPI(grupo.horaprog);
          fechaFinal = datosHoraProg.fecha;
          horaFinal = datosHoraProg.hora;
          horaprogFinal = grupo.fecha ? formatearHoraProg(grupo.fecha) : '';
        }

        const payload = pasajerosSeleccionados.map((pasajero, index) => ({
          codcliente: pasajero.codigo,
          codlan: pasajero.codlan,
          nombre: pasajero.apepate,
          fecha: fechaFinal,
          hora: horaFinal,
          tipo: grupo.tipo,
          horaprog: horaprogFinal,
          orden: String((grupo.cantidadPasajeros || 0) + index + 1),
          grupo: String(grupo.id),
          empresa: grupo.empresa,
          destinocodigo: grupo.destinocodigo || '',
          destinocodlugar: pasajero.codlugar.toString(),
        }));

        const url = `https://do.velsat.pe:2083/api/Talma/AgregarPasajero?usuario=${username}`;

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            toast.success(
              `${pasajerosSeleccionados.length} pasajero(s) agregado(s) correctamente`,
            );
            setPasajerosSeleccionados([]);

            if (onRefrescarDatos) {
              await onRefrescarDatos();
            }

            onOpenChange();
          } else {
            toast.error('Error al agregar los pasajeros');
          }
        } catch (error) {
          toast.error('Ocurrió un error al procesar los pasajeros');
        }
      } else {
        let agregadosExitosamente = 0;
        let errores = 0;

        for (const pasajero of pasajerosSeleccionados) {
          const payload = {
            arealan: grupo.empresa,
            destinocodlugar: pasajero.codlugar.toString(),
            distancia: 0,
            empresa: grupo.empresa,
            fecha: grupo.fecha,
            horaprog: grupo.horaprog,
            numero: (grupo.id - 1).toString(),
            orden: '0',
            pasajero: {
              codlan: pasajero.codlan,
              nombre: pasajero.apepate,
            },
            rol: 'Ninguno',
            tipo: grupo.tipo,
          };

          const url = `${API_BASE_URL125}/api/Preplan/AgregarPasajero?usuario=${username}`;

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              agregadosExitosamente++;
            } else {
              errores++;
            }
          } catch (error) {
            errores++;
          }
        }

        if (agregadosExitosamente > 0) {
          toast.success(
            `${agregadosExitosamente} pasajero(s) agregado(s) correctamente`,
          );
        }

        if (errores > 0) {
          toast.error(`${errores} pasajero(s) no se pudieron agregar`);
        }

        if (agregadosExitosamente > 0) {
          setPasajerosSeleccionados([]);
          if (onRefrescarDatos) {
            onRefrescarDatos();
          }
          if (errores === 0) {
            onOpenChange();
          }
        }
      }
    } catch (error) {
      toast.error('Ocurrió un error al procesar los pasajeros');
    } finally {
      setAgregandoPasajeros(false);
    }
  };

  const handleCerrarModal = () => {
    setPasajerosSeleccionados([]);
    setPasajeroSeleccionado(null);
    onOpenChange();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCerrarModal}
      title="Agregar Pasajeros al Servicio"
      subtitle={`Grupo ${grupo.id}`}
      icon={<MdLibraryAdd className="h-4 w-4 text-[#113eb9]" />}
      iconBgColor="bg-blue-100"
      size="3xl"
      isDismissable={false}
      cancelText="Cerrar"
      onCancel={handleCerrarModal}
      confirmText={`Agregar ${pasajerosSeleccionados.length} pasajero(s)`}
      loadingText={`Agregando ${pasajerosSeleccionados.length} pasajero(s)...`}
      onConfirm={handleAgregarTodos}
      isLoading={agregandoPasajeros}
      isConfirmDisabled={pasajerosSeleccionados.length === 0}
      confirmButtonClass="bg-[#113eb9] hover:bg-blue-700 text-white"
    >
      {/* Input para seleccionar pasajero */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          Buscar y seleccionar pasajero:
        </h4>
        {username === 'movilbus' ? (
          <InputPasajeroEmpresa
            onSelectPasajero={handleSeleccionarPasajero}
            clearAfterSelect={true}
            empresa={grupo.empresa}
          />
        ) : (
          <InputPasajero
            onSelectPasajero={handleSeleccionarPasajero}
            clearAfterSelect={true}
          />
        )}
      </div>

      {/* Lista de pasajeros seleccionados */}
      {pasajerosSeleccionados.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Pasajeros seleccionados ({pasajerosSeleccionados.length}):
          </h4>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-2">
            {pasajerosSeleccionados.map((pasajero, index) => (
              <div
                key={pasajero.codlan}
                className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {index + 1}. {pasajero.apepate}
                  </p>
                  <p className="text-xs text-gray-600">
                    Código: {pasajero.codlan} | Lugar: {pasajero.codlugar}
                  </p>
                  <p className="text-xs text-gray-600">
                    Cliente: {pasajero.codigo}
                  </p>
                </div>
                <button
                  onClick={() => handleEliminarPendiente(pasajero.codlan)}
                  className="ml-2 rounded p-1 text-red-600 hover:bg-red-100"
                  title="Eliminar de la lista"
                >
                  <MdDelete size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-center text-sm text-gray-600">
            Aún no has agregado pasajeros a la lista. Busca y selecciona
            pasajeros para agregarlos.
          </p>
        </div>
      )}
    </BaseModal>
  );
}
