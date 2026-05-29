import { IsIn, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { UNIDADES_MEDIDA } from '../entities/insumo.entity';

export class CreateInsumoDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsIn(UNIDADES_MEDIDA)
  unidadMedida!: (typeof UNIDADES_MEDIDA)[number];

  @IsNumber()
  @Min(0)
  stockActual!: number;

  @IsNumber()
  @Min(0)
  stockMinimo!: number;

  @IsNumber()
  @Min(0)
  precioPorUnidad!: number;
}
