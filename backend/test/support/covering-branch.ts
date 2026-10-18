import request from 'supertest';

type HttpServer = Parameters<typeof request>[0];

// Desde HU-23 el cliente elige la sucursal y el servidor ya no asigna la más cercana: los tests que solo
// necesitan un pedido válido piden la primera activa que cubre esa ubicación.
export async function coveringBranchId(server: HttpServer, latitude: number, longitude: number): Promise<string> {
  const response = await request(server).get('/api/branches/available').query({ lat: latitude, lng: longitude });
  if (response.status !== 200 || response.body.branches.length === 0) {
    throw new Error(`Ninguna sucursal activa cubre ${latitude}, ${longitude}`);
  }
  return response.body.branches[0].id as string;
}
