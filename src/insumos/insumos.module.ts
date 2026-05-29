import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insumo } from './entities/insumo.entity';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Insumo])],
  controllers: [InsumosController],
  providers: [InsumosService],
})
export class InsumosModule {}
