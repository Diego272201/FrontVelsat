'use client';

import React, { useState } from 'react';
import '@/app/styles/login.css';
import { Button, Input } from '@nextui-org/react';
import { EyeSlashFilledIcon } from './EyeFilledIcon';
import { EyeFilledIcon } from './EyeSlashFilledIcon';
import Slider from './Slider';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [login, setLogin] = useState('');
  const [clave, setClave] = useState('');

  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);

    const responseNextAuth = await signIn('credentials', {
      login,
      clave,
      redirect: false,
    });

    console.log(responseNextAuth);

    if (responseNextAuth?.error) {
      setErrors(responseNextAuth.error.split(','));
      return;
    }

    router.push('/trackvelnew');
  };

  return (
    <div className="login">
      {/* Inicio del slider */}
      <div className="imgLogin">
        <Slider></Slider>
      </div>
      {/* Fin del slider */}

      <div className="formLogin">
        <div className="imgCenter">
          <img src="/velsatLogo.png" alt="LogoVelsat" />
        </div>

        <h2>¡ Bienvenido de vuelta !</h2>

        <form action="" className="inputsf" onSubmit={handleSubmit}>
          <Input
            type="text"
            label="Usuario"
            placeholder="Ingresar usuario"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
          />

          <Input
            label="Password"
            placeholder="Ingresar password"
            value={clave}
            onChange={(event) => setClave(event.target.value)}
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
