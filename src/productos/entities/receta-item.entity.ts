import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';
import { Insumo } from '../../insumos/entities/insumo.entity';

@Entity('receta_items')
export class RecetaItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  productoId!: number;

  @ManyToOne(() => Producto, (producto) => producto.receta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto!: Producto;

  @Column({ type: 'int' })
  insumoId!: number;

  @ManyToOne(() => Insumo, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'insumoId' })
  insumo!: Insumo;

  @Column({ type: 'double' })
  cantidadPorHornada!: number;
}
