import { IDestino } from '@/app/components/inputs/IDestino';
import InputDestino from '@/app/components/inputs/InputDestino';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@nextui-org/react';
import { useEffect, useRef, useState } from 'react';
import { TbEdit, TbGpsFilled } from 'react-icons/tb';
import { toast } from 'sonner';
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  Autocomplete,
} from '@react-google-maps/api';
import { useForm } from 'react-hook-form';

const libraries: 'places'[] = ['places'];

export default function App({
  onDestinoSeleccionado,
}: {
  onDestinoSeleccionado: (nombre: string, codigo: string) => void;
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editable, setEditable] = useState(false);
  const identificadorRef = useRef<HTMLInputElement>(null);

  const [codlan, setCodlan] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [nomDestino, setNomDestino] = useState('');

  const { reset } = useForm();

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      const location = place.geometry?.location;

      if (location) {
        const lat = location.lat();
        const lng = location.lng();

        setMarkerPosition({ lat, lng });

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }

        reset((prev) => ({
          ...prev,
          direccion: place.formatted_address || '',
        }));

        setDireccion(place.formatted_address || '');
        setLatitud(lat.toString());
        setLongitud(lng.toString());
      }
    }
  };

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  }>({ lat: 0, lng: 0 });

  const containerStyle = {
    width: '100%',
    height: '250px',
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries,
  });

  const handleClose = () => {
    reset((prev) => ({
      ...prev,

      identificador: '',
      nombre: '',
      telefono: '',
      sexo: '',
      empresa: '',
      tarifa: '',
      direccion: '',
      distrito: '',
      latitud: '',
      longitud: '',
    }));
    setMarkerPosition({ lat: 0, lng: 0 });
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose();
    }
  }, [isOpen]);

  const [destinoSeleccionado, setDestinoSeleccionado] =
    useState<IDestino | null>(null);

  const handleSelectDestino = (destino: IDestino) => {
    setDestinoSeleccionado(destino);
    setCodlan(destino.codlan ?? '');
    setDireccion(destino.lugar.direccion ?? '');
    setDistrito(destino.lugar.distrito ?? '');
    setLatitud(destino.lugar.wy ?? '');
    setLongitud(destino.lugar.wx ?? '');
  };

  const handleSeleccionar = () => {
    if (destinoSeleccionado) {
      onDestinoSeleccionado(
        destinoSeleccionado.apepate || '',
        destinoSeleccionado.codigo,
      );
      onOpenChange();
      toast.success('Destino seleccionado correctamente.');
      resetCampos();
    } else {
      toast.error('Debes seleccionar un destino.');
    }
  };

  const habilitarEdicion = () => {
    // Asegúrate de no perder los datos existentes
    if (destinoSeleccionado && !nomDestino) {
      setNomDestino(destinoSeleccionado.apepate ?? '');
    }
    setEditable(true);
    setTimeout(() => {
      identificadorRef.current?.focus();
    }, 0);
  };

  const activarCampos = () => {
    setEditable(true);
    setTimeout(() => {
      identificadorRef.current?.focus();
    }, 0);
  };

  const handleGuardarDestino = async () => {
    if (!editable) {
      toast.error(
        'Primero debes hacer clic en "Nuevo" para habilitar los campos.',
      );
      return;
    }
    if (
      !codlan ||
      !nomDestino ||
      !direccion ||
      !distrito ||
      !latitud ||
      !longitud
    ) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    try {
      const response = await fetch(
        'https://velsat.pe:2096/api/Pasajero/NewDestino/movilbus',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codlan,
            apellidos: nomDestino,
            direccion,
            distrito,
            wy: latitud,
            wx: longitud,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Error al guardar el destino.');
      }

      toast.success('Destino guardado correctamente.');
      onOpenChange();
      setEditable(false);
      resetCampos();
    } catch (error) {
      toast.error('Hubo un problema al guardar el destino.');
      console.error(error);
    }
  };

  const resetCampos = () => {
    setCodlan('');
    setDireccion('');
    setDistrito('');
    setLatitud('');
    setLongitud('');
    setNomDestino('');
    setDestinoSeleccionado(null);
  };

  useEffect(() => {
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (!isNaN(lat) && !isNaN(lng)) {
      const newPos = { lat, lng };
      setMarkerPosition(newPos);

      if (mapRef.current) {
        mapRef.current.panTo(newPos);
        mapRef.current.setZoom(18);
      }
    }
  }, [latitud, longitud]);

  return (
    <>
      <button
        onClick={onOpen}
        className="ml-2 mt-[1px] bg-blue-600 px-1 py-1 text-[12px] text-white hover:bg-blue-500 rounded"
      >
        <TbEdit size={18} />
      </button>

      <Modal
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 z-[1000] h-[85vh] w-[70%] max-w-none overflow-auto"
        isOpen={isOpen}
        onOpenChange={(open) => {
          onOpenChange();
          if (!open) setEditable(false);
          resetCampos();
        }}
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800">
                  <TbGpsFilled size={20} />
                  MODIFICAR DESTINO
                </h2>
              </ModalHeader>
              <ModalBody>
                <div className="mt-[-15px]">
                  <label className="block text-[12px] font-medium">
                    Identificador:
                  </label>
                  <input
                    ref={identificadorRef}
                    disabled={!editable}
                    required
                    className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                    placeholder="Ejemplo: Colegio ABC"
                    value={codlan}
                    onChange={(e) => setCodlan(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium">
                    Nombre Punto:
                  </label>
                  <div className="flex gap-2">
                    <div className="w-full">
                      {editable ? (
                        <input
                          className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-[12px]"
                          placeholder="Escribe el nuevo destino"
                          value={nomDestino}
                          onChange={(e) => setNomDestino(e.target.value)}
                          required
                        />
                      ) : (
                        <InputDestino onSelectDestino={handleSelectDestino} />
                      )}
                    </div>

                    <button
                      onClick={handleSeleccionar}
                      className="rounded bg-blue-500 px-3 py-1 text-[12px] text-white hover:bg-blue-400"
                    >
                      Seleccionar
                    </button>

                    <button
                      onClick={habilitarEdicion}
                      className="rounded bg-amber-500 px-3 py-1 text-[12px] text-white hover:bg-amber-400"
                    >
                      Editar
                    </button>

                    <button
                      onClick={activarCampos}
                      className="rounded bg-green-700 px-3 py-1 text-[12px] text-white hover:bg-green-600"
                    >
                      Nuevo
                    </button>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Dirección:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Distrito:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Latitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={latitud}
                      onChange={(e) => setLatitud(e.target.value)}
                    />
                  </div>

                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Longitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={longitud}
                      onChange={(e) => setLongitud(e.target.value)}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <Autocomplete
                    onLoad={(autocomplete) =>
                      (autocompleteRef.current = autocomplete)
                    }
                    onPlaceChanged={onPlaceChanged}
                  >
                    <>
                      <label className="mb-1 block text-[12px] font-medium text-gray-900">
                        Buscar dirección
                      </label>
                      <input
                        disabled={!editable}
                        type="text"
                        placeholder="Escribe una dirección..."
                        className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      />
                    </>
                  </Autocomplete>
                </div>

                <div className="mt-4 w-full rounded border">
                  {isLoaded && (
                    <div className="w-full">
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={
                          markerPosition.lat !== 0 && markerPosition.lng !== 0
                            ? markerPosition
                            : { lat: -12.0464, lng: -77.0428 }
                        }
                        zoom={
                          markerPosition.lat !== 0 && markerPosition.lng !== 0
                            ? 18
                            : 5
                        }
                        onLoad={(map) => {
                          mapRef.current = map;
                        }}
                        onClick={(e) => {
                          const lat = e.latLng?.lat() || 0;
                          const lng = e.latLng?.lng() || 0;

                          setMarkerPosition({ lat, lng });
                          setLatitud(lat.toString());
                          setLongitud(lng.toString());
                        }}
                      >
                        {markerPosition.lat !== 0 &&
                          markerPosition.lng !== 0 && (
                            <Marker
                              position={markerPosition}
                              draggable={true}
                              onDragEnd={(e) => {
                                const lat = e.latLng?.lat() || 0;
                                const lng = e.latLng?.lng() || 0;

                                setMarkerPosition({ lat, lng });
                                setLatitud(lat.toString());
                                setLongitud(lng.toString());
                              }}
                            />
                          )}
                      </GoogleMap>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter>
                <button
                  className="rounded bg-red-600 px-4 py-2 text-[14px] text-white hover:bg-red-500"
                  onClick={onClose}
                >
                  Cerrar
                </button>

                <button
                  className={`rounded px-4 py-2 text-[14px] text-white ${!editable ? 'bg-gray-500 hover:bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}
                  onClick={handleGuardarDestino}
                >
                  Guardar Destino
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
