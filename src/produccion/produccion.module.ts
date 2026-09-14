import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produccion } from './entities/produccion.entity';
import { ProduccionConsumo } from './entities/produccion-consumo.entity';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';
import { Producto } from '../productos/entities/producto.entity';
import { RecetaItem } from '../productos/entities/receta-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Produccion, ProduccionConsumo, Producto, RecetaItem, Insumo]),
  ],
  controllers: [ProduccionController],
  providers: [ProduccionService],
})
export class ProduccionModule {}
