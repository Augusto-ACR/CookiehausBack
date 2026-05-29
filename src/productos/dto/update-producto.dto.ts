import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PRODUCTO_CATEGORIAS } from '../entities/producto.entity';
import { CreateRecetaItemDto } from './create-receta-item.dto';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsIn(PRODUCTO_CATEGORIAS)
  categoria?: (typeof PRODUCTO_CATEGORIAS)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVenta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rindePorHornada?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecetaItemDto)
  receta?: CreateRecetaItemDto[];
}
