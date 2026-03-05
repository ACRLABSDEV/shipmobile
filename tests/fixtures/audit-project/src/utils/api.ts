import axios from 'axios';

const API_URL = 'http://api.example.com/v1';
const API_KEY = 'sk_live_abcdefghijklmnopqrstuvwxyz123456';

export async function fetchData() {
  console.log('Fetching data from API');
  const response = await axios.get(API_URL, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  return response.data;
}

if (__DEV__) {
  console.debug('Debug mode enabled');
}
