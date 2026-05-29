import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Compra } from './entities/compra.entity';
import { CompraItem } from './entities/compra-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';
import { CreateCompraDto } from './dto/create-compra.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private readonly comprasRepository: Repository<Compra>,
    @InjectRepository(CompraItem)
    private readonly compraItemsRepository: Repository<CompraItem>,
    @InjectRepository(Insumo)
    private readonly insumosRepository: Repository<Insumo>,
  ) {}

  findAll(): Promise<Compra[]> {
    return this.comprasRepository.find({
      relations: { items: { insumo: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Compra> {
    const compra = await this.comprasRepository.findOne({
      where: { id },
      relations: { items: { insumo: true } },
    });

    if (!compra) {
      throw new NotFoundException('Compra no encontrada.');
    }

    return compra;
  }

  async create(createCompraDto: CreateCompraDto): Promise<Compra> {
    this.validateDuplicados(createCompraDto.items.map((item) => item.insumoId));

    const compraId = await this.comprasRepository.manager.transaction(async (manager) => {
      const insumoIds = createCompraDto.items.map((item) => item.insumoId);

      const insumos = await manager
        .getRepository(Insumo)
        .createQueryBuilder('insumo')
        .where({ id: In(insumoIds) })
        .setLock('pessimistic_write')
        .getMany();

      if (insumos.length !== insumoIds.length) {
        throw new BadRequestException('La compra contiene uno o más insumos inexistentes.');
      }

      const insumosById = new Map(insumos.map((insumo) => [insumo.id, insumo]));

      const itemsProcesados = createCompraDto.items.map((item) => {
        const insumo = insumosById.get(item.insumoId);
        if (!insumo) {
          throw new BadRequestException(`Insumo ${item.insumoId} no encontrado.`);
        }

        if (item.precioUnitario < 0) {
          throw new BadRequestException('El precio unitario no puede ser negativo.');
        }

        return {
          insumoId: item.insumoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.cantidad * item.precioUnitario,
        };
      });

      for (const item of itemsProcesados) {
        const insumo = insumosById.get(item.insumoId)!;
        await manager.increment(Insumo, { id: insumo.id }, 'stockActual', item.cantidad);
        await manager.update(Insumo, { id: insumo.id }, { precioPorUnidad: item.precioUnitario });
      }

      const total = itemsProcesados.reduce((acc, item) => acc + item.subtotal, 0);

      const compra = manager.create(Compra, {
        total,
        observaciones: createCompraDto.observaciones?.trim() || null,
      });

      const savedCompra = await manager.save(Compra, compra);

      const entities = itemsProcesados.map((item) =>
        manager.create(CompraItem, {
          compraId: savedCompra.id,
          ...item,
        }),
      );

      await manager.save(CompraItem, entities);

      return savedCompra.id;
    });

    return this.findOne(compraId);
  }

  private validateDuplicados(ids: number[]) {
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException('No se puede repetir el mismo insumo en una compra.');
    }
  }
}
