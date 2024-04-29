import axios from 'axios';
import { urlAPISimplifid } from '../urlsApi/urlApi';


export const fecthDataDevice = async () =>{
  try {
    const response = await axios.get(urlAPISimplifid);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos:', error);
    throw error;
  }
}