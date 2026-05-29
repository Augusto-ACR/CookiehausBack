import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UNIDADES_MEDIDA } from '../entities/insumo.entity';

export class UpdateInsumoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsIn(UNIDADES_MEDIDA)
  unidadMedida?: (typeof UNIDADES_MEDIDA)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioPorUnidad?: number;
}
