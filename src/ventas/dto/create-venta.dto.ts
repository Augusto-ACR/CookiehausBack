import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVentaItemDto } from './create-venta-item.dto';

export class CreateVentaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items!: CreateVentaItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;
}
