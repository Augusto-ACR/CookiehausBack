import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from './entities/compra.entity';
import { CompraItem } from './entities/compra-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, CompraItem, Insumo])],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
