import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Compra } from './compra.entity';
import { Insumo } from '../../insumos/entities/insumo.entity';

@Entity('compra_items')
export class CompraItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  compraId!: number;

  @ManyToOne(() => Compra, (compra) => compra.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compraId' })
  compra!: Compra;

  @Column({ type: 'int' })
  insumoId!: number;

  @ManyToOne(() => Insumo, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'insumoId' })
  insumo!: Insumo;

  @Column({ type: 'double' })
  cantidad!: number;

  @Column({ type: 'double' })
  precioUnitario!: number;

  @Column({ type: 'double' })
  subtotal!: number;
}
