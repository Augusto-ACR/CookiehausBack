import { MigrationInterface, QueryRunner } from 'typeorm';

// Primera migración del proyecto. ADITIVA: crea una tabla nueva y no toca datos
// existentes. La base de producción se creó con synchronize (no tiene tabla
// `migrations`); TypeORM la crea al correr esta migración.
//
// Escrita a mano (no hay base local para generarla): coincide con
// src/produccion/entities/produccion-consumo.entity.ts, incluidos los nombres de
// constraints e índice, así un synchronize accidental no vería diferencias.
export class CrearProduccionConsumos1789330000000 implements MigrationInterface {
  name = 'CrearProduccionConsumos1789330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "produccion_consumos" (
        "id" SERIAL NOT NULL,
        "produccionId" integer NOT NULL,
        "insumoId" integer NOT NULL,
        "cantidad" double precision NOT NULL,
        "precioPorUnidad" double precision NOT NULL,
        CONSTRAINT "PK_produccion_consumos" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_produccion_consumos_produccionId" ON "produccion_consumos" ("produccionId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "produccion_consumos"
        ADD CONSTRAINT "FK_produccion_consumos_produccion"
        FOREIGN KEY ("produccionId") REFERENCES "producciones"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "produccion_consumos"
        ADD CONSTRAINT "FK_produccion_consumos_insumo"
        FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revierte el schema completo. Los consumos guardados desde el deploy se pierden
    // (las producciones siguen existiendo; se revertirían con la receta actual).
    await queryRunner.query(`DROP TABLE "produccion_consumos"`);
  }
}
