import { IsInt, Min } from 'class-validator';

export class CreateVentaItemDto {
  @IsInt()
  @Min(1)
  productoId!: number;

  @IsInt()
  @Min(1)
  cantidad!: number;
}
