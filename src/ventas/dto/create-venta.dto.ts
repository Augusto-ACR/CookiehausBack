import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
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

export const CANALES_VENTA = [
  'rappi',
  'pedidosya',
  'whatsapp',
  'instagram',
  'local',
  'otro',
] as const;

export class CreateVentaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items!: CreateVentaItemDto[];

  @IsOptional()
  @IsIn(CANALES_VENTA)
  canal?: string;

  @IsOptional()
  @IsBoolean()
  cobrado?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;

  @IsOptional()
  @IsBoolean()
  esBox?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioBox?: number;
}
