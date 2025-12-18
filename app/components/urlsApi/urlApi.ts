const baseUrl = '';

const getSimplifiedDeviceListUrl = (deviceGroup: string): string =>
  `${baseUrl}/DeviceList/simplified/${deviceGroup}`;

const getDeviceListUrl = (deviceGroup: string): string =>
  `${baseUrl}/DeviceList/${deviceGroup}`;

const UrlLogin = '/api/Login/login';

export { getSimplifiedDeviceListUrl, getDeviceListUrl, UrlLogin };

export const API_BASE_URL = 'https://do.velsat.pe:2083/api/Preplan';

export const API_BASE_URL125 = 'https://do.velsat.pe:2083';


export const getApiConductoresUrl = (usuario: string) => `${API_BASE_URL}/conductores?usuario=${usuario}`;

export const getApiUnidadesUrl = (usuario: string) => `${API_BASE_URL}/unidades?usuario=${usuario}`;

// Api para los select y selectall
export const getDeviceListUrlSelect = (baseUrl: string, username: string) =>
  `${baseUrl}/api/DeviceList/simplified/${username}`;
