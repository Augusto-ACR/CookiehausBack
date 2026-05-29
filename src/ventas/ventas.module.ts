import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { VentaItem } from './entities/venta-item.entity';
import { Producto } from '../productos/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, VentaItem, Producto])],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
