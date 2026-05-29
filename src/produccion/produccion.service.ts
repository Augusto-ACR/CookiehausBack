import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Produccion } from './entities/produccion.entity';
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
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Produccion> {
    const produccion = await this.produccionRepository.findOne({ where: { id } });
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
}
