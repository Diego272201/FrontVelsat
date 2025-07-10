const baseUrl = '';

const getSimplifiedDeviceListUrl = (deviceGroup: string): string =>
  `${baseUrl}/DeviceList/simplified/${deviceGroup}`;

const getDeviceListUrl = (deviceGroup: string): string =>
  `${baseUrl}/DeviceList/${deviceGroup}`;

const UrlLogin = '/api/Login/login';

export { getSimplifiedDeviceListUrl, getDeviceListUrl, UrlLogin };

export const API_BASE_URL = 'https://velsat.pe:2096/api/Preplan';

export const API_BASE_URL125 = 'https://velsat.pe:2096';


export const getApiConductoresUrl = (usuario: string) => `${API_BASE_URL}/conductores?usuario=${usuario}`;

export const API_UNIDADES = `${API_BASE_URL}/unidades`;

// Api para los select y selectall
export const getDeviceListUrlSelect = (baseUrl: string, username: string) =>
  `${baseUrl}/api/DeviceList/simplified/${username}`;
