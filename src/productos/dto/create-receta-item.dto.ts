import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateRecetaItemDto {
  @IsInt()
  @Min(1)
  insumoId!: number;

  @IsNumber()
  @Min(0.000001)
  cantidadPorHornada!: number;
}
