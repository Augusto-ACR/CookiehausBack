import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCompraItemDto } from './create-compra-item.dto';

export class CreateCompraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCompraItemDto)
  items!: CreateCompraItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observaciones?: string;
}
