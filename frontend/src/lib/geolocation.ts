export type DevicePosition = {
  latitude: number;
  longitude: number;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

export function requestDevicePosition(): Promise<DevicePosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Geolocalización no disponible en este dispositivo.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('No pudimos obtener tu ubicación; cargala a mano.'));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error('Se agotó el tiempo al pedir tu ubicación; cargala a mano.'));
          return;
        }
        reject(new Error('No pudimos obtener tu ubicación; cargala a mano.'));
      },
      GEO_OPTIONS,
    );
  });
}

export function formatCoordinate(value: number, digits = 6): string {
  return value.toFixed(digits);
}
