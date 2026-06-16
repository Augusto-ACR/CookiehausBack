import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompraDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  observaciones?: string | null;
}
