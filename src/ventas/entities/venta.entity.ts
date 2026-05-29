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

  @Column({ type: 'double' })
  totalBruto!: number;

  @Column({ type: 'double' })
  total!: number;

  @Column({ type: 'double', default: 0 })
  descuentoPorcentaje!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observaciones!: string | null;

  @OneToMany(() => VentaItem, (item) => item.venta)
  items!: VentaItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
