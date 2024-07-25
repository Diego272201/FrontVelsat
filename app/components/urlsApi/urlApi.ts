const baseUrl = '';

const getSimplifiedDeviceListUrl = (deviceGroup: string): string => `${baseUrl}/DeviceList/simplified/${deviceGroup}`;


const getDeviceListUrl = (deviceGroup: string): string => `${baseUrl}/DeviceList/${deviceGroup}`;

const UrlLogin = '/api/Login/login';

export { getSimplifiedDeviceListUrl, getDeviceListUrl, UrlLogin };