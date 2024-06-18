'use client';
import React, { useState, useCallback } from 'react';
import '@/app/styles/login.css';
import { Button, Input } from '@nextui-org/react';
import { EyeSlashFilledIcon } from './EyeFilledIcon';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import { EyeFilledIcon } from './EyeSlashFilledIcon';
import Slider from './Slider';



export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [login, setLogin] = useState('');
  const [clave, setClave] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  const toggleVisibility = useCallback(() => setIsVisible((prev) => !prev), []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrors([]);
      const responseNextAuth = await signIn('credentials', {
        login,
        clave,
        redirect: false,
      });
      if (responseNextAuth?.error) {
        setErrors(responseNextAuth.error.split(','));
        return;
      }
      router.push('/trackvelnew');
    },
    [login, clave, router],
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
            onChange={(event:any) => setLogin(event.target.value)}
          />
          <Input
            label="Password"
            placeholder="Ingresar password"
            value={clave}
            onChange={(event:any) => setClave(event.target.value)}
            endContent={
              <button
                className="focus:outline-none"
                type="button"
                onClick={toggleVisibility}
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
          <Button className="buttonLogin" type="submit">
            Iniciar sesión
          </Button>
        </form>
      </div>
      <button onClick={() => toast('My first toast')}>Give me a toast</button>
      <Toaster></Toaster>
      {errors.length > 0 && (
        <div>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </div>
      )}
    </div>
  );
}
