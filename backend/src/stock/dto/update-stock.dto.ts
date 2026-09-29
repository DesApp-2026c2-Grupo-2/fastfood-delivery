import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// El admin carga solo lo disponible; lo reservado lo mueven los pedidos.
export class UpdateStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  available!: number;
}
