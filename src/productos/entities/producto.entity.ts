import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RecetaItem } from './receta-item.entity';

export const PRODUCTO_CATEGORIAS = ['clasica', 'premium', 'especial'] as const;
export type ProductoCategoria = (typeof PRODUCTO_CATEGORIAS)[number];

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'varchar', length: 20 })
  categoria!: ProductoCategoria;

  @Column({ type: 'double precision' })
  precioVenta!: number;

  @Column({ type: 'double precision', default: 0 })
  stock!: number;

  @Column({ type: 'int' })
  rindePorHornada!: number;

  @OneToMany(() => RecetaItem, (item) => item.producto)
  receta!: RecetaItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
