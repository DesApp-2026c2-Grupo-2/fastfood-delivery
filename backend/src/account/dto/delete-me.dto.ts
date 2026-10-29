import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteMeDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
