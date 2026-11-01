import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PROVINCES } from '../provinces';

// Vacío equivale a "sin dato": se guarda null y, en la edición, borra lo que había.
const blankToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export function CityField() {
  return applyDecorators(Transform(blankToNull), IsOptional(), IsString(), MaxLength(80));
}

export function ProvinceField() {
  return applyDecorators(
    Transform(blankToNull),
    IsOptional(),
    IsIn(PROVINCES, { message: 'Elegí una provincia de la lista' }),
  );
}

// 4 dígitos (1425) o el CPA de 8 caracteres (C1425ABC).
export function PostalCodeField() {
  return applyDecorators(
    Transform((params) => {
      const value = blankToNull(params);
      return typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value;
    }),
    IsOptional(),
    IsString(),
    Matches(/^([A-Z]\d{4}[A-Z]{3}|\d{4})$/, { message: 'El código postal tiene 4 números (1425) o es un CPA (C1425ABC)' }),
  );
}
