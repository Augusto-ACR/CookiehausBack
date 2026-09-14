import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Insumo } from '../../insumos/entities/insumo.entity';
import { Produccion } from './produccion.entity';

// Lo que consumió cada producción, guardado al registrarla. Permite eliminar una
// producción devolviendo exactamente lo que se usó, aunque después cambie la receta.
// Las producciones anteriores a esta tabla no tienen filas acá.
@Entity('produccion_consumos')
export class ProduccionConsumo {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_produccion_consumos',
  })
  id!: number;

  @Index('IDX_produccion_consumos_produccionId')
  @Column({ type: 'int' })
  produccionId!: number;

  @ManyToOne(() => Produccion, (produccion) => produccion.consumos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'produccionId',
    foreignKeyConstraintName: 'FK_produccion_consumos_produccion',
  })
  produccion!: Produccion;

  @Column({ type: 'int' })
  insumoId!: number;

  // Los insumos se eliminan con soft delete: la fila sigue existiendo.
  @ManyToOne(() => Insumo, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'insumoId',
    foreignKeyConstraintName: 'FK_produccion_consumos_insumo',
  })
  insumo!: Insumo;

  @Column({ type: 'double precision' })
  cantidad!: number;

  // Precio del insumo al momento de producir (referencia; no se usa para devolver stock).
  @Column({ type: 'double precision' })
  precioPorUnidad!: number;
}
