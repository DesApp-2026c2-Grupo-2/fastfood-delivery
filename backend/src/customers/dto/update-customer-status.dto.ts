import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateCustomerStatusDto {
  // Se toma el valor crudo: con enableImplicitConversion cualquier string (incluso "false") pasaría a true.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.active)
  @IsBoolean()
  active!: boolean;
}
