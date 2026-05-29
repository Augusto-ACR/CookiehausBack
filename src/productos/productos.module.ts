import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity';
import { RecetaItem } from './entities/receta-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, RecetaItem, Insumo])],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
