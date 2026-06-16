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
import { RecetaItem } from '../productos/entities/receta-item.entity';
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
    @InjectRepository(RecetaItem)
    private readonly recetaItemsRepository: Repository<RecetaItem>,
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
        const recetaItems = await manager.find(RecetaItem, {
          where: { productoId: In(productoIds) },
        });

        const requerimientosInsumos = new Map<number, number>();
        for (const item of itemsProcesados) {
          const producto = productosById.get(item.productoId)!;
          const recetaDelProducto = recetaItems.filter((ri) => ri.productoId === item.productoId);
          for (const ri of recetaDelProducto) {
            const requerido = ri.cantidadPorHornada * (item.cantidad / producto.rindePorHornada);
            requerimientosInsumos.set(
              ri.insumoId,
              (requerimientosInsumos.get(ri.insumoId) ?? 0) + requerido,
            );
          }
        }

        const insumoIds = [...requerimientosInsumos.keys()];
        if (insumoIds.length > 0) {
          const insumos = await manager
            .getRepository(Insumo)
            .createQueryBuilder('insumo')
            .where({ id: In(insumoIds) })
            .setLock('pessimistic_write')
            .getMany();

          const insumosById = new Map(insumos.map((insumo) => [insumo.id, insumo]));

          const faltantes: string[] = [];
          for (const [insumoId, requerido] of requerimientosInsumos) {
            const insumo = insumosById.get(insumoId);
            if (insumo && insumo.stockActual < requerido) {
              faltantes.push(
                `${insumo.nombre}: requiere ${requerido.toFixed(2)} ${insumo.unidadMedida} y hay ${insumo.stockActual}`,
              );
            }
          }

          if (faltantes.length > 0) {
            throw new BadRequestException(
              `Stock de insumos insuficiente para la venta box. ${faltantes.join(' | ')}`,
            );
          }

          for (const [insumoId, requerido] of requerimientosInsumos) {
            await manager.decrement(Insumo, { id: insumoId }, 'stockActual', requerido);
          }
        }
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
