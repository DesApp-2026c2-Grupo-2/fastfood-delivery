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
  delivery_price_per_km: {
    label: 'Precio de envío por km',
    description: 'Lo que se cobra por cada km de envío a domicilio, por cuadra (100 m) iniciada. 0 = envío gratis.',
    unit: '$/km',
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    integer: false,
  },
  loyalty_orders_required: {
    label: 'Pedidos para premio de fidelidad',
    description:
      'Cada N pedidos (con monto mínimo) el cliente recibe el descuento de fidelidad. Si cancela, el mordi se revierte.',
    unit: 'pedidos',
    defaultValue: 10,
    min: 1,
    max: 100,
    integer: true,
  },
  loyalty_min_order_amount: {
    label: 'Monto mínimo por mordi',
    description: 'Subtotal mínimo del pedido (sin envío) para sumar un mordi al confirmar. Se revierte si cancela.',
    unit: '$',
    defaultValue: 15_000,
    min: 0,
    max: 1_000_000,
    integer: false,
  },
  loyalty_discount_percent: {
    label: 'Descuento de fidelidad',
    description: 'Porcentaje de descuento que se aplica al pedido que cumple la meta de mordis.',
    unit: '%',
    defaultValue: 30,
    min: 1,
    max: 100,
    integer: true,
  },
  top3_discount_percent: {
    label: 'Descuento Top 3 compradores',
    description: 'Porcentaje de descuento de un solo uso que reciben los 3 mayores compradores al cerrar la campaña.',
    unit: '%',
    defaultValue: 15,
    min: 1,
    max: 100,
    integer: true,
  },
} as const;

export type ParameterKey = keyof typeof PARAMETERS;

export type ParameterValues = Record<ParameterKey, number>;

export const PARAMETER_KEYS = Object.keys(PARAMETERS) as ParameterKey[];