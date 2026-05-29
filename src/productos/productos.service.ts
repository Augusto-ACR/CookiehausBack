import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { RecetaItem } from './entities/receta-item.entity';
import { Insumo } from '../insumos/entities/insumo.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { CreateRecetaItemDto } from './dto/create-receta-item.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(RecetaItem)
    private readonly recetaItemsRepository: Repository<RecetaItem>,
    @InjectRepository(Insumo)
    private readonly insumosRepository: Repository<Insumo>,
  ) {}

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    await this.ensureNombreDisponible(createProductoDto.nombre);
    await this.validateReceta(createProductoDto.receta);

    const productoId = await this.productosRepository.manager.transaction(
      async (manager) => {
        const producto = manager.create(Producto, {
          nombre: createProductoDto.nombre.trim(),
          categoria: createProductoDto.categoria,
          precioVenta: createProductoDto.precioVenta,
          stock: 0,
          rindePorHornada: createProductoDto.rindePorHornada,
        });

        const savedProducto = await manager.save(Producto, producto);

        const recetaItems = createProductoDto.receta.map((item) =>
          manager.create(RecetaItem, {
            productoId: savedProducto.id,
            insumoId: item.insumoId,
            cantidadPorHornada: item.cantidadPorHornada,
          }),
        );

        await manager.save(RecetaItem, recetaItems);
        return savedProducto.id;
      },
    );

    return this.findOne(productoId);
  }

  findAll(): Promise<Producto[]> {
    return this.productosRepository.find({
      relations: { receta: { insumo: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id },
      relations: { receta: { insumo: true } },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return producto;
  }

  async update(id: number, updateProductoDto: UpdateProductoDto): Promise<Producto> {
    const existing = await this.productosRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (updateProductoDto.nombre) {
      await this.ensureNombreDisponible(updateProductoDto.nombre, id);
    }

    if (updateProductoDto.receta) {
      await this.validateReceta(updateProductoDto.receta);
    }

    await this.productosRepository.manager.transaction(async (manager) => {
      const { receta, ...productoFields } = updateProductoDto;

      await manager.update(Producto, id, {
        ...productoFields,
        nombre: productoFields.nombre?.trim(),
      });

      if (receta) {
        await manager.delete(RecetaItem, { productoId: id });

        const recetaItems = receta.map((item) =>
          manager.create(RecetaItem, {
            productoId: id,
            insumoId: item.insumoId,
            cantidadPorHornada: item.cantidadPorHornada,
          }),
        );

        await manager.save(RecetaItem, recetaItems);
      }
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const existing = await this.productosRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado.');
    }

    await this.productosRepository.softDelete(id);
    return { message: 'Producto eliminado correctamente.' };
  }

  private async ensureNombreDisponible(nombre: string, excludeId?: number) {
    const qb = this.productosRepository
      .createQueryBuilder('producto')
      .where('LOWER(producto.nombre) = :nombre', {
        nombre: nombre.trim().toLowerCase(),
      })
      .andWhere('producto.deletedAt IS NULL');

    if (excludeId) {
      qb.andWhere('producto.id != :excludeId', { excludeId });
    }

    const repeated = await qb.getOne();
    if (repeated) {
      throw new ConflictException('Ya existe un producto con ese nombre.');
    }
  }

  private async validateReceta(receta: CreateRecetaItemDto[]) {
    const ids = receta.map((item) => item.insumoId);
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length !== ids.length) {
      throw new BadRequestException('No se puede repetir el mismo insumo en la receta.');
    }

    const existingInsumos = await this.insumosRepository.findBy({
      id: In(uniqueIds),
    });

    if (existingInsumos.length !== uniqueIds.length) {
      throw new BadRequestException('La receta contiene uno o más insumos inexistentes.');
    }
  }
}
