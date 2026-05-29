import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('producciones')
export class Produccion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  productoId!: number;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'productoId' })
  producto!: Producto;

  @Column({ type: 'int' })
  horneadas!: number;

  @Column({ type: 'int' })
  galletitasProducidas!: number;

  @Column({ type: 'double precision' })
  costoEstimado!: number;

  @Column({ type: 'varchar', length: 400, nullable: true })
  notas!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
