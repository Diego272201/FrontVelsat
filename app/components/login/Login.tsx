'use client';
import React, { useState, useCallback, useEffect } from 'react';
import "@/app/styles/login.css";
import { Button, Input } from '@nextui-org/react';
import { EyeSlashFilledIcon } from './EyeFilledIcon';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import { EyeFilledIcon } from './EyeSlashFilledIcon';
import Slider from './Slider';
import { useApi } from '@/context/ApiContext';
import * as signalR from '@microsoft/signalr';

export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [login, setLogin] = useState('');
  const [clave, setClave] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();
  const [servidorUrl, setServidorUrl] = useState('');

  const toggleVisibility = useCallback(() => setIsVisible((prev) => !prev), []);

  const { baseUrl } = useApi();


  
  const obtenerServidor = async (usuario: string) => {
    try {
      const response = await fetch(`https://66.240.210.125:8586/api/Server/${usuario}`);
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
    if (login.length > 0) {
  
      const fetchServidor = async () => {
        const url = await obtenerServidor(login);
        if (url) setServidorUrl(url);
      };
  
      fetchServidor();
    }


  }, [login,servidorUrl]); 
  

  useEffect(() => {
    if (servidorUrl) {
      console.log("servidorUrl actualizado:", servidorUrl);
    }
  }, [servidorUrl]);




  const handleSignalRConnection = async (username: string) => {
   

    const hubUrl = `${servidorUrl}/dataHubDevice?username=${username}`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    try {
      await connection.start();
      await connection.invoke('UnirGrupo', username);
      console.log(`Conexión SignalR establecida y unida al grupo: ${username}`);
      
      connection.on('ActualizarDatos', (datos) => {
        console.log('Datos recibidos de SignalR:', datos);
        localStorage.setItem(`fechaActual_${username}`, datos.fechaActual);
        localStorage.setItem(`deviceList_${username}`, JSON.stringify(datos.datosDevice));

      });
    } catch (error) {
      console.error('Error al conectar con SignalR:', error);
    }
  };

  

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const toastId = toast.loading('Autenticando...');
      setErrors([]);
      const responseNextAuth = await signIn('credentials', {
        login,
        clave,
        redirect: false,
      });
      if (responseNextAuth?.error) {
        setErrors(responseNextAuth.error.split(','));
        toast.error('Error: ' + responseNextAuth.error, { id: toastId });
      } else {
        toast.success('¡Autenticación exitosa!', { id: toastId });

        const username = login;
        handleSignalRConnection(username);
        localStorage.setItem('currentUser', username);

        router.push('/trackvelnew');

      }
    },
    [login, clave, router,baseUrl],
  );

  
  return (
    <div className="login">
      <div className="imgLogin">
        <Slider />
      </div>
      <div className="formLogin">
        <div className="imgCenter">
          <Image
            src="/velsatLogo.png"
            alt="LogoVelsat"
            width={'100'}
            height={'100'}
          />
        </div>
        <h2>¡ Bienvenido de vuelta !</h2>
        <form action="" className="inputsf" onSubmit={handleSubmit}>
          <Input
            type="text"
            label="Usuario"
            placeholder="Ingresar usuario"
            value={login}
            onChange={(event: any) => setLogin(event.target.value)}
            className="custom-input"
          />
          <Input
            label="Password"
            placeholder="Ingresar password"
            value={clave}
            onChange={(event: any) => setClave(event.target.value)}
            endContent={
              <button
                className="focus:outline-none"
                type="button"
                onClick={toggleVisibility}
                aria-label={"Mostrar Ocultar contraseña"}
              >
                {isVisible ? (
                  <EyeSlashFilledIcon className="pointer-events-none text-2xl text-default-400" />
                ) : (
                  <EyeFilledIcon className="pointer-events-none text-2xl text-default-400" />
                )}
              </button>
            }
            type={isVisible ? 'text' : 'password'}
          />
          <Button className="buttonLogin" type="submit"         
        >
            Iniciar sesión
          </Button>
        </form>
      </div>

      <Toaster closeButton richColors  ></Toaster>


    </div>
  );
}
