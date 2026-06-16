import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VentaItem } from './venta-item.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'double precision' })
  totalBruto!: number;

  @Column({ type: 'double precision' })
  total!: number;

  @Column({ type: 'double precision', default: 0 })
  descuentoPorcentaje!: number;

  @Column({ type: 'varchar', length: 20, default: 'otro' })
  canal!: string;

  @Column({ type: 'boolean', default: true })
  cobrado!: boolean;

  @Column({ type: 'boolean', default: false })
  esBox!: boolean;

  @Column({ type: 'double precision', nullable: true })
  precioBox!: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observaciones!: string | null;

  @OneToMany(() => VentaItem, (item) => item.venta)
  items!: VentaItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
