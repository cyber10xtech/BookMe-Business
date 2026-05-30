import { Geolocation } from '@capacitor/geolocation';

export const requestLocation = async () => {
  try {
    const pos = await Geolocation.getCurrentPosition();
    console.log(pos);
  } catch (err) {
    console.log('Location denied');
  }
};