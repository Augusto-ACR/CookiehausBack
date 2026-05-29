import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecetaItemDto } from './create-receta-item.dto';
import { PRODUCTO_CATEGORIAS } from '../entities/producto.entity';

export class CreateProductoDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsIn(PRODUCTO_CATEGORIAS)
  categoria!: (typeof PRODUCTO_CATEGORIAS)[number];

  @IsNumber()
  @Min(0)
  precioVenta!: number;

  @IsInt()
  @Min(1)
  rindePorHornada!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecetaItemDto)
  receta!: CreateRecetaItemDto[];
}
