import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateCompraItemDto {
  @IsInt()
  @Min(1)
  insumoId!: number;

  @IsNumber()
  @Min(0.000001)
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precioUnitario!: number;
}
