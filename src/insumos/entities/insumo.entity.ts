import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const UNIDADES_MEDIDA = ['gr', 'kg', 'unidades', 'ml', 'l'] as const;
export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

@Entity('insumos')
export class Insumo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'varchar', length: 20 })
  unidadMedida!: UnidadMedida;

  @Column({ type: 'double precision' })
  stockActual!: number;

  @Column({ type: 'double precision' })
  stockMinimo!: number;

  @Column({ type: 'double precision' })
  precioPorUnidad!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
