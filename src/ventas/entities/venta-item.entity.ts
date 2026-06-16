import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('venta_items')
export class VentaItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  ventaId!: number;

  @ManyToOne(() => Venta, (venta) => venta.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaId' })
  venta!: Venta;

  @Column({ type: 'int' })
  productoId!: number;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'productoId' })
  producto!: Producto;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'double precision' })
  precioUnitario!: number;

  @Column({ type: 'double precision', default: 0 })
  descuentoPorcentaje!: number;

  @Column({ type: 'double precision' })
  subtotal!: number;
}
