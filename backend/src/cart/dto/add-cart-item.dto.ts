import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trimNotes = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Transform(trimNotes)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
