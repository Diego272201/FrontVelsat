'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Spinner } from '@nextui-org/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Slider from './Slider';
import { useApi } from '@/context/ApiContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

// Cache global para servidores
const serverCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 horas

export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [login, setLogin] = useState('');
  const [clave, setClave] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [servidorUrl, setServidorUrl] = useState('');
  
  const router = useRouter();
  const { baseUrl } = useApi();
  
  // Referencias para optimizaciones
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleVisibility = useCallback(() => setIsVisible((prev) => !prev), []);

  // Función ultra-optimizada para obtener servidor
  const obtenerServidor = useCallback(async (usuario: string): Promise<string | null> => {
    const trimmedUser = usuario.trim().toLowerCase();
    
    if (!trimmedUser) return null;

    const cached = serverCache.get(trimmedUser);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`⚡ Cache hit para ${trimmedUser}`);
      return cached.url;
    }

    try {
      const localCache = localStorage.getItem(`server_${trimmedUser}`);
      if (localCache) {
        const parsed = JSON.parse(localCache);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          serverCache.set(trimmedUser, parsed);
          console.log(`💾 Cache localStorage para ${trimmedUser}`);
          return parsed.url;
        }
      }
    } catch (e) {
      console.warn('Error leyendo cache local:', e);
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 3000);

      const response = await fetch(`https://velsat.pe:8586/api/Server/${trimmedUser}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.servidor) {
        throw new Error('Servidor no encontrado');
      }

      const cacheData = { url: data.servidor, timestamp: Date.now() };
      serverCache.set(trimmedUser, cacheData);
      
      try {
        localStorage.setItem(`server_${trimmedUser}`, JSON.stringify(cacheData));
      } catch (e) {
        console.warn('Error guardando cache:', e);
      }

      console.log(`🎯 Servidor obtenido: ${data.servidor}`);
      return data.servidor;

    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        return null;
      }
      
      console.error('Error obteniendo servidor:', error);
      
      if (cached) {
        console.warn(`⚠️ Usando cache expirado para ${trimmedUser}`);
        return cached.url;
      }
      
      setErrors(['No se pudo obtener el servidor para el usuario.']);
      return null;
    }
  }, []);

  // Effect optimizado con debounce más rápido
  useEffect(() => {
    if (!login.trim()) {
      setErrors([]);
      setServidorUrl('');
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce reducido para mayor velocidad
    timeoutRef.current = setTimeout(async () => {
      const url = await obtenerServidor(login.trim());
      if (url) {
        setServidorUrl(url);
        setErrors([]);
        try {
          localStorage.setItem('servidorUrl', url);
        } catch (e) {
          console.warn('Error guardando servidor:', e);
        }
      }
    }, 200); // Reducido de 800ms a 400ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [login, obtenerServidor]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Precargar recursos
  useEffect(() => {
    router.prefetch('/trackvelnew');
  }, [router]);

  // Submit ultra-rápido SIN mensaje de éxito
  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrors([]);

    const trimmedLogin = login.trim();
    const trimmedClave = clave.trim();

    if (!trimmedLogin || !trimmedClave) {
      setErrors(['Complete usuario y contraseña']);
      setIsLoading(false);
      return;
    }

    try {
      // Timeout agresivo para auth
      const authPromise = signIn('credentials', {
        login: trimmedLogin,
        clave: trimmedClave,
        redirect: false,
        callbackUrl: '/trackvelnew',
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );

      const responseNextAuth = await Promise.race([authPromise, timeoutPromise]) as any;

      if (responseNextAuth?.error) {
        setErrors(responseNextAuth.error.split(','));
        setIsLoading(false);
      } else if (responseNextAuth?.ok) {
        // ✅ SIN MENSAJE DE ÉXITO - REDIRECCIÓN INMEDIATA
        try {
          localStorage.setItem('currentUser', trimmedLogin);
        } catch (e) {
          console.warn('Error guardando usuario:', e);
        }
        
        // Redirección instantánea sin delays
        router.push('/trackvelnew');
        // No setear isLoading(false) ni isSuccess para mantener el spinner hasta redirigir
        
      } else {
        throw new Error('Respuesta inválida');
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setErrors([
        errorMessage === 'Timeout' 
          ? 'La autenticación está tardando más de lo esperado.'
          : 'Error de autenticación. Verifique sus credenciales.'
      ]);
      setIsLoading(false);
    }
  }, [login, clave, router]);

  // Enter para submit rápido
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && servidorUrl && login.trim() && clave.trim()) {
      handleSubmit(e as any);
    }
  }, [handleSubmit, isLoading, servidorUrl, login, clave]);

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
          <h2 className="text-xl font-bold uppercase tracking-wide text-blue-100 xl:text-2xl">
            <span className="text-orange-400">TrackVel</span> System
          </h2>
        </div>

        {/* Overlay con información */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 text-white xl:p-12">
          <div className="space-y-3 xl:space-y-4">
            <h1 className="text-3xl font-bold uppercase leading-tight text-[#edf2f4] xl:text-4xl">
              Rastreamiento de Vehículos
              <span className="block text-orange-400">en Tiempo Real</span>
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
      <div className="flex w-full items-center justify-center bg-[url('/pe-02.svg')] bg-[length:180%] bg-center bg-no-repeat p-6 lg:w-[30%] lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo y encabezado */}
          <div className="mb-6 text-center xl:mb-8">
            <div className="flex items-center justify-center rounded-sm p-2">
              <Image
                src="/logoVS.png"
                alt="LogoVelsat"
                width={180}
                height={180}
                priority
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
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 xl:py-3"
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
                {/* Indicador sutil de servidor encontrado */}
                {servidorUrl && !errors.length && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  </div>
                )}
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
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-2.5 pr-12 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 xl:py-3"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label="Mostrar/Ocultar contraseña"
                  disabled={isLoading}
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

            {/* Botón de login - SIN estado de éxito */}
            <button
              type="submit"
              className={`flex w-full transform items-center justify-center space-x-2 rounded-lg px-8 py-2.5 font-semibold shadow-lg transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed xl:py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-[1.02] hover:shadow-xl ${
                isLoading ? 'opacity-75' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner color="warning" size="sm" />
                  <span className="text-sm xl:text-base">Autenticando...</span>
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
              © 2025 Velsat - Sistema de Rastreamiento Vehicular
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}