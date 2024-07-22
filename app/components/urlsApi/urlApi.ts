// urlApi.ts
let baseUrl = 'http://66.240.210.125:8586';

const setBaseUrl = (url: string) => {
  baseUrl = url;
  console.log('Base URL updated to:', baseUrl);
};

const getUrl = (endpoint: string): string => `${baseUrl}${endpoint}`;

const getSimplifiedDeviceListUrl = (deviceGroup: string): string => getUrl(`/api/DeviceList/simplified/${deviceGroup}`);


const getDeviceListUrl = (deviceGroup: string): string => `${baseUrl}/DeviceList/${deviceGroup}`;
const urlLogin = 'http://66.240.210.125:8586/api/Login/login';

export { setBaseUrl, getSimplifiedDeviceListUrl, getDeviceListUrl, getUrlLogin };
