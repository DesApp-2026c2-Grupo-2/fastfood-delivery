import { applyDecorators } from '@nestjs/common';
import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const MAX_EXTRAS_PER_ITEM = 10;

/** Validación de `extraIds`: lista opcional de ids de adicionales, sin repetidos. */
export const ExtraIds = () =>
  applyDecorators(
    IsOptional(),
    IsArray(),
    ArrayMaxSize(MAX_EXTRAS_PER_ITEM),
    ArrayUnique(),
    IsString({ each: true }),
    IsNotEmpty({ each: true }),
  );
