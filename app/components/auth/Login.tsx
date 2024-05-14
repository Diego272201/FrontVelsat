'use client';

import React from 'react';
import '@/app/styles/login.css';
import { Button, Input } from '@nextui-org/react';
import { EyeSlashFilledIcon } from './EyeFilledIcon';
import { EyeFilledIcon } from './EyeSlashFilledIcon';
import Slider from './Slider';


export default function Login() {
  const [isVisible, setIsVisible] = React.useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div className="login">
      {/* Inicio del slider */}
      <div className='imgLogin'>
        <Slider></Slider>
      </div>
      {/* Fin del slider */}

      <div className="formLogin">
        <div className='imgCenter'>
          <img src="/velsatLogo.png" alt="LogoVelsat" />
        </div>

        <h2>¡ Bienvenido de vuelta !</h2>

        <form action="" className="inputsf">
          <Input type="text" label="Usuario" placeholder="Ingresar usuario" />

          <Input
            label="Password"
            placeholder="Ingresar password"
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
          <Button
            className="buttonLogin"
          >
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}