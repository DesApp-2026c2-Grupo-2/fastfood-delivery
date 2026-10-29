import { Transform } from 'class-transformer';
import { AdminRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/password';

export class CreateAdminDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  // Contraseña inicial: el nuevo admin la cambia desde su perfil (PATCH /api/me).
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  // Sin rol se crea super_admin, como antes de que existieran los roles.
  @IsOptional()
  @IsEnum(AdminRole, { message: 'El rol debe ser super_admin u orders_viewer' })
  adminRole?: AdminRole;
}
