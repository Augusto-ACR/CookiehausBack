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
import { Insumo } from '../insumos/entities/insumo.entity';
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
    @InjectRepository(Insumo)
    private readonly insumosRepository: Repository<Insumo>,
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
        const itemDescuento = item.descuentoPorcentaje ?? 0;
        const subtotal = Number(
          (precioUnitario * item.cantidad * (1 - itemDescuento / 100)).toFixed(2),
        );

        return {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario,
          descuentoPorcentaje: itemDescuento,
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

      const esBox = createVentaDto.esBox ?? false;

      if (esBox) {
        if (!createVentaDto.boxInsumoId || !createVentaDto.cantidadBox) {
          throw new BadRequestException(
            'Las ventas box requieren seleccionar un tipo de caja y la cantidad.',
          );
        }

        const insumoBox = await manager
          .getRepository(Insumo)
          .createQueryBuilder('insumo')
          .where({ id: createVentaDto.boxInsumoId })
          .setLock('pessimistic_write')
          .getOne();

        if (!insumoBox) {
          throw new BadRequestException('El insumo de caja seleccionado no existe.');
        }

        if (insumoBox.stockActual < createVentaDto.cantidadBox) {
          throw new BadRequestException(
            `Stock insuficiente de cajas (${insumoBox.nombre}). Disponible: ${insumoBox.stockActual}, requerido: ${createVentaDto.cantidadBox}.`,
          );
        }

        await manager.decrement(
          Insumo,
          { id: createVentaDto.boxInsumoId },
          'stockActual',
          createVentaDto.cantidadBox,
        );
      }

      const totalBruto = itemsProcesados.reduce((acc, item) => acc + item.subtotal, 0);

      let totalFinal: number;
      let descuentoPorcentaje: number;

      if (esBox) {
        if (createVentaDto.precioBox == null || createVentaDto.precioBox < 0) {
          throw new BadRequestException('Las ventas en formato box requieren un precio de box válido.');
        }
        totalFinal = Number(createVentaDto.precioBox.toFixed(2));
        descuentoPorcentaje = 0;
      } else {
        descuentoPorcentaje = createVentaDto.descuentoPorcentaje ?? 0;
        const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
        totalFinal = Number((totalBruto - descuentoMonto).toFixed(2));
      }

      const venta = manager.create(Venta, {
        totalBruto,
        total: totalFinal,
        descuentoPorcentaje,
        canal: createVentaDto.canal ?? 'otro',
        cobrado: createVentaDto.cobrado ?? true,
        observaciones: createVentaDto.observaciones?.trim() || null,
        esBox,
        precioBox: esBox ? totalFinal : null,
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

  async updateCobrado(id: number, cobrado: boolean): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({ where: { id } });
    if (!venta) throw new NotFoundException('Venta no encontrada.');
    await this.ventasRepository.update(id, { cobrado });
    return this.findOne(id);
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
