import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Produccion } from './entities/produccion.entity';
import { ProduccionConsumo } from './entities/produccion-consumo.entity';
import { CreateProduccionDto } from './dto/create-produccion.dto';
import { Producto } from '../productos/entities/producto.entity';
import { RecetaItem } from '../productos/entities/receta-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';

interface RequerimientoInsumo {
  insumoId: number;
  nombre: string;
  unidadMedida: string;
  requerido: number;
  disponible: number;
  precioPorUnidad: number;
}

@Injectable()
export class ProduccionService {
  constructor(
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(RecetaItem)
    private readonly recetaItemsRepository: Repository<RecetaItem>,
    @InjectRepository(Insumo)
    private readonly insumosRepository: Repository<Insumo>,
  ) {}

  findAll(): Promise<Produccion[]> {
    return this.produccionRepository.find({
      relations: { consumos: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Produccion> {
    const produccion = await this.produccionRepository.findOne({
      where: { id },
      relations: { consumos: true },
    });
    if (!produccion) {
      throw new NotFoundException('Registro de producción no encontrado.');
    }
    return produccion;
  }

  async create(createProduccionDto: CreateProduccionDto) {
    const result = await this.produccionRepository.manager.transaction(
      async (manager) => {
        const producto = await manager.findOne(Producto, {
          where: { id: createProduccionDto.productoId },
        });

        if (!producto) {
          throw new NotFoundException('Producto no encontrado.');
        }

        const receta = await manager.find(RecetaItem, {
          where: { productoId: producto.id },
        });

        if (receta.length === 0) {
          throw new BadRequestException(
            'El producto no tiene receta configurada para producir.',
          );
        }

        const insumoIds = receta.map((item) => item.insumoId);
        const insumos = await manager
          .getRepository(Insumo)
          .createQueryBuilder('insumo')
          .where({ id: In(insumoIds) })
          .setLock('pessimistic_write')
          .getMany();

        const insumosById = new Map(insumos.map((insumo) => [insumo.id, insumo]));

        const requerimientos: RequerimientoInsumo[] = receta.map((item) => {
          const insumo = insumosById.get(item.insumoId);

          if (!insumo) {
            throw new BadRequestException(
              `El insumo con id ${item.insumoId} no está disponible.`,
            );
          }

          const requerido = item.cantidadPorHornada * createProduccionDto.horneadas;

          return {
            insumoId: insumo.id,
            nombre: insumo.nombre,
            unidadMedida: insumo.unidadMedida,
            requerido,
            disponible: insumo.stockActual,
            precioPorUnidad: insumo.precioPorUnidad,
          };
        });

        const faltantes = requerimientos.filter(
          (item) => item.disponible < item.requerido,
        );

        if (faltantes.length > 0) {
          const detalle = faltantes
            .map(
              (item) =>
                `${item.nombre}: requiere ${item.requerido} ${item.unidadMedida} y hay ${item.disponible}`,
            )
            .join(' | ');

          throw new BadRequestException(
            `Stock insuficiente para producir. ${detalle}`,
          );
        }

        for (const item of requerimientos) {
          await manager.decrement(
            Insumo,
            { id: item.insumoId },
            'stockActual',
            item.requerido,
          );
        }

        const galletitasProducidas =
          producto.rindePorHornada * createProduccionDto.horneadas;

        await manager.increment(
          Producto,
          { id: producto.id },
          'stock',
          galletitasProducidas,
        );

        const costoEstimado = requerimientos.reduce(
          (acc, item) => acc + item.requerido * item.precioPorUnidad,
          0,
        );

        const produccion = manager.create(Produccion, {
          productoId: producto.id,
          horneadas: createProduccionDto.horneadas,
          galletitasProducidas,
          costoEstimado,
          notas: createProduccionDto.notas?.trim() || null,
        });

        const saved = await manager.save(Produccion, produccion);

        // Consumo real, para poder eliminar la producción devolviendo exactamente esto.
        await manager.save(
          ProduccionConsumo,
          requerimientos.map((item) =>
            manager.create(ProduccionConsumo, {
              produccionId: saved.id,
              insumoId: item.insumoId,
              cantidad: item.requerido,
              precioPorUnidad: item.precioPorUnidad,
            }),
          ),
        );

        return {
          savedId: saved.id,
          productoNombre: producto.nombre,
          requerimientos,
        };
      },
    );

    const produccion = await this.findOne(result.savedId);

    return {
      ...produccion,
      productoNombre: result.productoNombre,
      consumoInsumos: result.requerimientos,
    };
  }

  /**
   * Elimina una producción cargada por error: devuelve a stock los insumos que consumió
   * y descuenta las cookies que sumó.
   *
   * - Se bloquea si esas cookies ya no están en stock (se vendieron): nunca deja el stock
   *   del producto en negativo ni devuelve insumos de cookies vendidas.
   * - Devuelve el consumo guardado al registrarla. Las producciones anteriores a la tabla
   *   produccion_consumos no lo tienen: para esas se usa la receta actual × horneadas, y la
   *   respuesta lo indica con `segunRecetaActual`.
   */
  async remove(id: number) {
    const resultado = await this.produccionRepository.manager.transaction(async (manager) => {
      const produccion = await manager
        .getRepository(Produccion)
        .createQueryBuilder('produccion')
        .where({ id })
        .setLock('pessimistic_write')
        .getOne();

      if (!produccion) {
        throw new NotFoundException('Registro de producción no encontrado.');
      }

      const producto = await manager
        .getRepository(Producto)
        .createQueryBuilder('producto')
        .where({ id: produccion.productoId })
        .setLock('pessimistic_write')
        .getOne();

      if (!producto) {
        throw new NotFoundException('El producto de esta producción ya no existe.');
      }

      if (producto.stock < produccion.galletitasProducidas) {
        throw new BadRequestException(
          `No se puede eliminar: se produjeron ${produccion.galletitasProducidas} ${producto.nombre} y quedan ${producto.stock} en stock. Anulá primero las ventas de esas cookies.`,
        );
      }

      const consumos = await manager.find(ProduccionConsumo, { where: { produccionId: id } });
      const segunRecetaActual = consumos.length === 0;

      const devoluciones = segunRecetaActual
        ? (await manager.find(RecetaItem, { where: { productoId: producto.id } })).map(
            (item) => ({
              insumoId: item.insumoId,
              cantidad: item.cantidadPorHornada * produccion.horneadas,
            }),
          )
        : consumos.map((consumo) => ({ insumoId: consumo.insumoId, cantidad: consumo.cantidad }));

      const insumoIds = [...new Set(devoluciones.map((d) => d.insumoId))];
      if (insumoIds.length > 0) {
        await manager
          .getRepository(Insumo)
          .createQueryBuilder('insumo')
          .where({ id: In(insumoIds) })
          .setLock('pessimistic_write')
          .getMany();
      }

      for (const devolucion of devoluciones) {
        await manager.increment(
          Insumo,
          { id: devolucion.insumoId },
          'stockActual',
          devolucion.cantidad,
        );
      }

      await manager.decrement(
        Producto,
        { id: producto.id },
        'stock',
        produccion.galletitasProducidas,
      );

      // Los consumos se borran en cascada (FK ON DELETE CASCADE).
      await manager.delete(Produccion, id);

      return {
        devoluciones,
        segunRecetaActual,
        galletitasDescontadas: produccion.galletitasProducidas,
      };
    });

    return {
      message: 'Producción eliminada: se devolvieron los insumos y se descontaron las cookies.',
      ...resultado,
    };
  }
}
