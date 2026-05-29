import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insumo } from './entities/insumo.entity';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';

@Injectable()
export class InsumosService {
  constructor(
    @InjectRepository(Insumo)
    private readonly insumosRepository: Repository<Insumo>,
  ) {}

  async create(createInsumoDto: CreateInsumoDto): Promise<Insumo> {
    const nombreNormalizado = createInsumoDto.nombre.trim().toLowerCase();
    const existing = await this.insumosRepository
      .createQueryBuilder('insumo')
      .where('LOWER(insumo.nombre) = :nombre', { nombre: nombreNormalizado })
      .andWhere('insumo.deletedAt IS NULL')
      .getOne();

    if (existing) {
      throw new ConflictException('Ya existe un insumo con ese nombre.');
    }

    const insumo = this.insumosRepository.create({
      ...createInsumoDto,
      nombre: createInsumoDto.nombre.trim(),
    });
    return this.insumosRepository.save(insumo);
  }

  findAll(): Promise<Insumo[]> {
    return this.insumosRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Insumo> {
    const insumo = await this.insumosRepository.findOne({ where: { id } });
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    return insumo;
  }

  async update(id: number, updateInsumoDto: UpdateInsumoDto): Promise<Insumo> {
    const existing = await this.insumosRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Insumo no encontrado.');
    }

    if (updateInsumoDto.nombre) {
      const nombreNormalizado = updateInsumoDto.nombre.trim().toLowerCase();
      const repeated = await this.insumosRepository
        .createQueryBuilder('insumo')
        .where('LOWER(insumo.nombre) = :nombre', { nombre: nombreNormalizado })
        .andWhere('insumo.id != :id', { id })
        .andWhere('insumo.deletedAt IS NULL')
        .getOne();

      if (repeated) {
        throw new ConflictException('Ya existe un insumo con ese nombre.');
      }
    }

    await this.insumosRepository.update(id, {
      ...updateInsumoDto,
      nombre: updateInsumoDto.nombre?.trim(),
    });

    const updated = await this.insumosRepository.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    return updated;
  }

  async remove(id: number): Promise<{ message: string }> {
    const existing = await this.insumosRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Insumo no encontrado.');
    }

    await this.insumosRepository.softDelete(id);
    return { message: 'Insumo eliminado correctamente.' };
  }
}
