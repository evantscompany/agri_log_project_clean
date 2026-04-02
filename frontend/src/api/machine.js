// frontend/src/api/machine.js
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';

export const getMachineInfo = async (vin) => {
  try {
    const response = await axios.get(`${API_URL}/machine/${vin}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('네트워크 연결 실패');
  }
};