/**
 * API de la cuenta del usuario (perfil y contraseña) de los backends de Velsat:
 *   - Trackvel New    → https://do.velsat.pe:2083   (backendApido)
 *   - SubTrackvel New → https://sub.velsat.pe:2096  (backendtrackvelsr)
 *
 * Las llamadas con sesión van al backend con el que inició sesión el usuario
 * (`session.user.serverUrl`) y llevan su JWT. Solo el cambio de contraseña desde el
 * enlace del correo es público: ahí el backend se deduce del parámetro `origen`.
 */
import { getSession } from 'next-auth/react';

const REQUEST_TIMEOUT_MS = 15000;

/** `origen` que ponen los backends en el enlace del correo → URL base del backend */
export const BACKEND_BY_ORIGEN: Record<string, string> = {
  trackvel: 'https://do.velsat.pe:2083',
  subtrackvel: 'https://sub.velsat.pe:2096',
};

/** Perfil tal como lo devuelve GET /api/Configuracion/perfil */
export interface PerfilCuentaDto {
  accountID: string;
  displayName: string | null;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
}

export interface SolicitudResetResponse {
  message: string;
  /** Correo al que se envió el enlace, con la parte local enmascarada */
  email: string;
  expiraEnMinutos: number;
}

/** Error de la API con el mensaje legible que devuelve el backend ({ message }). */
export class AccountApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AccountApiError';
    this.status = status;
  }
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  { token, body }: { token?: string; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/Configuracion${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await res.text().catch(() => '');
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }

    if (!res.ok) {
      const message =
        (data as { message?: string } | undefined)?.message ||
        (res.status === 401 ? 'Tu sesión venció. Vuelve a iniciar sesión.' : `Error ${res.status}`);
      throw new AccountApiError(message, res.status);
    }
    return data as T;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new AccountApiError('El servidor no respondió a tiempo', 0);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Backend y JWT de la sesión actual. */
async function sessionAuth(): Promise<{ baseUrl: string; token: string }> {
  const session = await getSession();
  const baseUrl = session?.user?.serverUrl?.trim();
  const token = session?.user?.token;
  if (!baseUrl || !token) throw new AccountApiError('No hay una sesión activa.', 401);
  return { baseUrl, token };
}

export async function fetchPerfil(): Promise<PerfilCuentaDto> {
  const { baseUrl, token } = await sessionAuth();
  return request<PerfilCuentaDto>(baseUrl, 'GET', '/perfil', { token });
}

/**
 * PUT perfil reemplaza TODOS los campos: se manda el perfil vigente con los cambios
 * encima para no borrar los que esta pantalla no edita (dirección, contacto…).
 */
export async function putPerfil(
  cambios: Pick<PerfilCuentaDto, 'displayName' | 'contactEmail' | 'contactPhone'>,
): Promise<void> {
  const { baseUrl, token } = await sessionAuth();
  const actual = await request<PerfilCuentaDto>(baseUrl, 'GET', '/perfil', { token });
  const { accountID: _accountID, description: _description, ...editable } = actual;
  await request<unknown>(baseUrl, 'PUT', '/perfil', { token, body: { ...editable, ...cambios } });
}

/** Envía al correo de la cuenta el enlace para cambiar la contraseña. */
export async function solicitarResetPassword(): Promise<SolicitudResetResponse> {
  const { baseUrl, token } = await sessionAuth();
  return request<SolicitudResetResponse>(baseUrl, 'POST', '/password/solicitar-reset', { token });
}

/** Cambia la contraseña con el token del enlace del correo (no requiere sesión). */
export async function resetPassword(
  origen: string,
  tokenReset: string,
  passwordNueva: string,
): Promise<void> {
  const baseUrl = BACKEND_BY_ORIGEN[origen];
  if (!baseUrl) throw new AccountApiError('El enlace no es válido.', 400);
  await request<unknown>(baseUrl, 'POST', '/password/reset', {
    body: { token: tokenReset, passwordNueva },
  });
}
