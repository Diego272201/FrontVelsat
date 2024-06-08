const baseUrl = 'http://66.240.210.125:8586/api';

const getSimplifiedDeviceListUrl = (deviceGroup: string): string => `${baseUrl}/DeviceList/simplified/${deviceGroup}`;


const getDeviceListUrl = (deviceGroup: string): string => `${baseUrl}/DeviceList/${deviceGroup}`;
const urlLogin = 'http://66.240.210.125:8586/api/Login/login';

export { getSimplifiedDeviceListUrl, getDeviceListUrl, urlLogin };
