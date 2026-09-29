// Parámetros del sistema (HU-19, RF-ADM-09). La clave es la de la tabla Parameter; `defaultValue`
// es el valor que se usa si la fila no existe, y el que carga la migración.
export const PARAMETERS = {
  coverage_radius_km: {
    label: 'Radio de cobertura',
    description: 'Distancia máxima entre la sucursal y la dirección de entrega.',
    unit: 'km',
    defaultValue: 5,
    min: 0.1,
    max: 100,
    integer: false,
  },
  eta_prep_base_min: {
    label: 'Preparación base',
    description: 'Minutos fijos de preparación de cada pedido.',
    unit: 'min',
    defaultValue: 15,
    min: 0,
    max: 240,
    integer: true,
  },
  eta_min_per_item: {
    label: 'Minutos por ítem',
    description: 'Minutos que se suman por cada unidad del pedido.',
    unit: 'min',
    defaultValue: 3,
    min: 0,
    max: 60,
    integer: true,
  },
  eta_km_per_min: {
    label: 'Velocidad de traslado',
    description: 'Kilómetros que recorre el repartidor por minuto (0,5 = 30 km/h).',
    unit: 'km/min',
    defaultValue: 0.5,
    min: 0.05,
    max: 10,
    integer: false,
  },
} as const;

export type ParameterKey = keyof typeof PARAMETERS;

export type ParameterValues = Record<ParameterKey, number>;

export const PARAMETER_KEYS = Object.keys(PARAMETERS) as ParameterKey[];
