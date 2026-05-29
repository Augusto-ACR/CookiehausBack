import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProduccionDto {
  @IsInt()
  @Min(1)
  productoId!: number;

  @IsInt()
  @Min(1)
  horneadas!: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notas?: string;
}
