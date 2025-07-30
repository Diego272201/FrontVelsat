'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { Spinner } from '@nextui-org/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Slider from './Slider';
import { useApi } from '@/context/ApiContext';
import { Eye, EyeOff, LogIn, Check, Wifi } from 'lucide-react';

export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [login, setLogin] = useState('');
  const [clave, setClave] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const [servidorUrl, setServidorUrl] = useState('');

  const toggleVisibility = useCallback(() => setIsVisible((prev) => !prev), []);

  const { baseUrl } = useApi();

  const obtenerServidor = async (usuario: string) => {
    try {
      const response = await fetch(
        `https://velsat.pe:2096/api/Server/${usuario}`,
      );
      const data = await response.json();

      if (data.servidor) {
        return data.servidor;
      } else {
        throw new Error('No se encontró el campo "servidor" en la respuesta');
      }
    } catch (error) {
      console.error('Error al obtener servidor:', error);
      setErrors(['No se pudo obtener el servidor para el usuario.']);
      return null;
    }
  };

  useEffect(() => {
    if (!login) {
      setErrors([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const url = await obtenerServidor(login);
      if (url) {
        setServidorUrl(url);
        setErrors([]);
        localStorage.setItem('servidorUrl', url);
      }
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [login]);

  useEffect(() => {
    if (servidorUrl) {
      console.log('servidorUrl actualizado:', servidorUrl);
    }
  }, [servidorUrl]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsLoading(true);
      setErrors([]);

      if (!login || !clave) {
        setErrors(['Complete usuario y contraseña']);
        setIsLoading(false);
        return;
      }

      try {
        const responseNextAuth = await signIn('credentials', {
          login,
          clave,
          redirect: false,
          callbackUrl: '/trackvelnew',
        });

        if (responseNextAuth?.error) {
          setErrors(responseNextAuth.error.split(','));
          setIsLoading(false);
        } else {
          const username = login;
          localStorage.setItem('currentUser', username);
          setIsSuccess(true);

          const urlGuardada = localStorage.getItem('servidorUrl');

          if (urlGuardada === 'https://sub.velsat.pe:2096') {
            router.replace('/subtrackvelnew');
          } else {
            router.replace('/trackvelnew');
          }
        }
      } catch (error: any) {
        console.error('Error durante la autenticación:', error);
        setErrors([error.message || 'Error durante la autenticación']);
        setIsLoading(false);
      }
    },
    [login, clave, router, baseUrl],
  );

  return (
    <div className="flex h-screen overflow-hidden overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Panel izquierdo con slider */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[70%]">
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-700/80 to-orange-900/50"></div>
        <div className="h-full w-full">
          <Slider />
        </div>

        {/* Título del sistema en la parte superior izquierda */}
        <div className="absolute left-8 top-8 z-30">
          <h2 className="text-4xl font-bold uppercase tracking-wide text-blue-100 xl:text-4xl">
            <span className="text-orange-400">TrackVel</span> System
          </h2>
        </div>

        {/* Overlay con información */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 text-white xl:p-12">
          <div className="space-y-3 xl:space-y-4">
            <h1 className="text-2xl font-bold uppercase leading-tight text-[#edf2f4] xl:text-2xl">
              Sistema de{' '}
              <span className="text-orange-400">control logístico</span>
            </h1>
            <p className="max-w-md text-base leading-tight text-white xl:text-[15px]">
              Monitorea tu flota con tecnología avanzada y obtén información
              precisa de la ubicación de tus vehículos.
            </p>
            <div className="flex items-center space-x-4 text-sm text-white">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                <span>Sistema en línea</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span>GPS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho con formulario */}
      <div className="relative flex w-full items-center justify-center bg-[url('/pe-02.svg')] bg-[length:180%] bg-center bg-no-repeat p-6 lg:w-[30%] lg:p-8">
        {/* Indicador de Conexión Segura */}
        <div className="absolute right-4 top-4 flex items-center space-x-2 rounded px-3 py-1.5 backdrop-blur-sm  ">
          <div className="relative text-green-400">
            <Wifi size={18} />
          </div>
          <span className="animate-pulse text-xs font-medium text-green-300">
            Conexión segura
          </span>
        </div>

        <div className="w-full max-w-md">
          {/* Logo y encabezado */}
          <div className="mb-6 text-center xl:mb-8">
            <div className="flex items-center justify-center rounded-sm p-2">
              <Image
                src="/logoVS.png"
                alt="LogoVelsat"
                width={180}
                height={180}
              />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white xl:text-3xl">
              ¡Bienvenido de vuelta!
            </h2>
            <p className="text-sm text-gray-300 xl:text-base">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-6">
            {/* Campo Usuario */}
            <div className="space-y-1 xl:space-y-2">
              <label className="text-sm font-medium text-white">Usuario</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ingresar usuario"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 xl:py-3"
                  disabled={isLoading || isSuccess}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1 xl:space-y-2">
              <label className="text-sm font-medium text-white">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={isVisible ? 'text' : 'password'}
                  placeholder="Ingresar contraseña"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-2.5 pr-12 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 xl:py-3"
                  disabled={isLoading || isSuccess}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label="Mostrar/Ocultar contraseña"
                  disabled={isLoading || isSuccess}
                >
                  {isVisible ? (
                    <EyeOff className="h-5 w-5 text-gray-400 transition-colors hover:text-white" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 transition-colors hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Mostrar errores */}
            {errors.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 backdrop-blur-sm xl:p-3">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-red-400 xl:h-5 xl:w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div className="min-w-0">
                    {errors.map((error, index) => (
                      <p
                        key={index}
                        className="text-xs text-red-300 xl:text-sm"
                      >
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mostrar mensaje de éxito */}
            {isSuccess && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-2.5 backdrop-blur-sm xl:p-3">
                <div className="flex items-center space-x-2">
                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500 xl:h-5 xl:w-5">
                    <Check className="h-2.5 w-2.5 text-white xl:h-3 xl:w-3" />
                  </div>
                  <p className="text-xs text-green-300 xl:text-sm">
                    ¡Autenticación exitosa! Redirigiendo...
                  </p>
                </div>
              </div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              className={`flex w-full transform items-center justify-center space-x-2 rounded-lg px-8 py-2.5 font-semibold shadow-lg transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed xl:py-3 ${
                isSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-[1.02] hover:shadow-xl'
              } ${isLoading || isSuccess ? 'opacity-75' : ''}`}
              disabled={isLoading || isSuccess}
            >
              {isLoading ? (
                <>
                  <Spinner color="warning" size="sm" />
                  <span className="text-sm xl:text-base">Autenticando...</span>
                </>
              ) : isSuccess ? (
                <>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white xl:h-5 xl:w-5">
                    <Check className="h-2.5 w-2.5 text-green-600 xl:h-3 xl:w-3" />
                  </div>
                  <span className="text-sm xl:text-base">
                    ¡Autenticado con éxito!
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm xl:text-base">Iniciar Sesión</span>
                  <LogIn className="h-4 w-4 xl:h-5 xl:w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center xl:mt-8">
            <p className="text-xs text-gray-400 xl:text-sm">
              © 2025 Velsat - Sistema de Control Logístico
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
