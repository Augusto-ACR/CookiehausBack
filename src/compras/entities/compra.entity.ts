import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompraItem } from './compra-item.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'double precision' })
  total!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observaciones!: string | null;

  @OneToMany(() => CompraItem, (item) => item.compra)
  items!: CompraItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
