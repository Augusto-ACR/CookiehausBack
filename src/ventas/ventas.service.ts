import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaItem } from './entities/venta-item.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(VentaItem)
    private readonly ventaItemsRepository: Repository<VentaItem>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
  ) {}

  findAll(): Promise<Venta[]> {
    return this.ventasRepository.find({
      relations: { items: { producto: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: { items: { producto: true } },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada.');
    }

    return venta;
  }

  async create(createVentaDto: CreateVentaDto): Promise<Venta> {
    this.validateDuplicados(createVentaDto.items.map((item) => item.productoId));

    const ventaId = await this.ventasRepository.manager.transaction(async (manager) => {
      const productoIds = createVentaDto.items.map((item) => item.productoId);

      const productos = await manager
        .getRepository(Producto)
        .createQueryBuilder('producto')
        .where({ id: In(productoIds) })
        .setLock('pessimistic_write')
        .getMany();

      if (productos.length !== productoIds.length) {
        throw new BadRequestException(
          'La venta contiene uno o más productos inexistentes.',
        );
      }

      const productosById = new Map(productos.map((producto) => [producto.id, producto]));

      const itemsProcesados = createVentaDto.items.map((item) => {
        const producto = productosById.get(item.productoId);
        if (!producto) {
          throw new BadRequestException(`Producto ${item.productoId} no encontrado.`);
        }

        if (producto.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, solicitado: ${item.cantidad}.`,
          );
        }

        const precioUnitario = producto.precioVenta;
        const subtotal = precioUnitario * item.cantidad;

        return {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal,
        };
      });

      for (const item of itemsProcesados) {
        await manager.decrement(
          Producto,
          { id: item.productoId },
          'stock',
          item.cantidad,
        );
      }

      const total = itemsProcesados.reduce((acc, item) => acc + item.subtotal, 0);
      const descuentoPorcentaje = createVentaDto.descuentoPorcentaje ?? 0;
      const descuentoMonto = (total * descuentoPorcentaje) / 100;
      const totalFinal = Number((total - descuentoMonto).toFixed(2));

      const venta = manager.create(Venta, {
        totalBruto: total,
        total: totalFinal,
        descuentoPorcentaje,
        observaciones: createVentaDto.observaciones?.trim() || null,
      });

      const savedVenta = await manager.save(Venta, venta);

      const entities = itemsProcesados.map((item) =>
        manager.create(VentaItem, {
          ventaId: savedVenta.id,
          ...item,
        }),
      );

      await manager.save(VentaItem, entities);

      return savedVenta.id;
    });

    return this.findOne(ventaId);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.ventasRepository.manager.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id },
        relations: { items: true },
      });

      if (!venta) {
        throw new NotFoundException('Venta no encontrada.');
      }

      if (venta.items.length > 0) {
        const productoIds = [...new Set(venta.items.map((item) => item.productoId))];

        await manager
          .getRepository(Producto)
          .createQueryBuilder('producto')
          .where({ id: In(productoIds) })
          .setLock('pessimistic_write')
          .getMany();

        for (const item of venta.items) {
          await manager.increment(
            Producto,
            { id: item.productoId },
            'stock',
            item.cantidad,
          );
        }
      }

      await manager.delete(Venta, id);
    });

    return {
      message: 'Venta eliminada y stock restaurado correctamente.',
    };
  }

  private validateDuplicados(ids: number[]) {
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException('No se puede repetir el mismo producto en una venta.');
    }
  }
}
