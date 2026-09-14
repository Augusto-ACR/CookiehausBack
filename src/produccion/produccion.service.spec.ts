import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { Insumo } from '../insumos/entities/insumo.entity';
import { Producto } from '../productos/entities/producto.entity';
import { RecetaItem } from '../productos/entities/receta-item.entity';
import { ProduccionConsumo } from './entities/produccion-consumo.entity';
import { Produccion } from './entities/produccion.entity';
import { ProduccionService } from './produccion.service';

// EntityManager falso en memoria: alcanza para las operaciones que usa el servicio
// (query builder con lock, find, increment/decrement, save, delete con cascada).
type Fila = Record<string, any>;
interface Tablas {
  producciones: Fila[];
  productos: Fila[];
  insumos: Fila[];
  receta: Fila[];
  consumos: Fila[];
}

const crearEntorno = (tablas: Tablas) => {
  const tabla = (entidad: unknown): Fila[] => {
    if (entidad === Produccion) return tablas.producciones;
    if (entidad === Producto) return tablas.productos;
    if (entidad === Insumo) return tablas.insumos;
    if (entidad === RecetaItem) return tablas.receta;
    if (entidad === ProduccionConsumo) return tablas.consumos;
    throw new Error('Entidad no soportada en el fake');
  };
  const idsDe = (valor: unknown): number[] =>
    valor instanceof FindOperator
      ? (valor.value as number[])
      : [valor as number];
  let siguienteId = 1000;

  const manager = {
    getRepository: (entidad: unknown) => ({
      createQueryBuilder: () => {
        let filtro: Fila = {};
        const qb = {
          where: (w: Fila) => ((filtro = w), qb),
          setLock: () => qb,
          getOne: async () =>
            tabla(entidad).find((f) => f.id === filtro.id) ?? null,
          getMany: async () =>
            tabla(entidad).filter((f) => idsDe(filtro.id).includes(f.id)),
        };
        return qb;
      },
    }),
    find: async (entidad: unknown, opciones: { where: Fila }) =>
      tabla(entidad).filter((f) =>
        Object.entries(opciones.where).every(([k, v]) => f[k] === v),
      ),
    findOne: async (entidad: unknown, opciones: { where: Fila }) =>
      (await manager.find(entidad, opciones))[0] ?? null,
    increment: async (
      entidad: unknown,
      where: Fila,
      campo: string,
      valor: number,
    ) => {
      tabla(entidad).find((f) => f.id === where.id)![campo] += valor;
    },
    decrement: async (
      entidad: unknown,
      where: Fila,
      campo: string,
      valor: number,
    ) => {
      tabla(entidad).find((f) => f.id === where.id)![campo] -= valor;
    },
    create: (_entidad: unknown, datos: Fila) => ({ ...datos }),
    save: async (entidad: unknown, datos: Fila | Fila[]) => {
      const lista = Array.isArray(datos) ? datos : [datos];
      for (const fila of lista) {
        fila.id ??= ++siguienteId;
        tabla(entidad).push(fila);
      }
      return datos;
    },
    delete: async (entidad: unknown, id: number) => {
      if (entidad !== Produccion)
        throw new Error('delete solo para Produccion');
      tablas.producciones.splice(
        tablas.producciones.findIndex((p) => p.id === id),
        1,
      );
      // FK ON DELETE CASCADE
      tablas.consumos = tablas.consumos.filter((c) => c.produccionId !== id);
    },
  };

  const produccionRepository = {
    manager: {
      transaction: (cb: (m: typeof manager) => unknown) => cb(manager),
    },
    findOne: async ({ where }: { where: Fila }) =>
      tablas.producciones.find((p) => p.id === where.id) ?? null,
  };

  const service = new ProduccionService(
    produccionRepository as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, tablas };
};

// Receta actual de «Clásica»: 2 kg de harina y 500 gr de manteca por hornada.
const base = (): Tablas => ({
  productos: [{ id: 1, nombre: 'Clásica', stock: 40, rindePorHornada: 24 }],
  insumos: [
    {
      id: 10,
      nombre: 'Harina',
      unidadMedida: 'kg',
      stockActual: 5,
      precioPorUnidad: 1200,
    },
    {
      id: 11,
      nombre: 'Manteca',
      unidadMedida: 'gr',
      stockActual: 1000,
      precioPorUnidad: 9.5,
    },
  ],
  receta: [
    { id: 1, productoId: 1, insumoId: 10, cantidadPorHornada: 2 },
    { id: 2, productoId: 1, insumoId: 11, cantidadPorHornada: 500 },
  ],
  producciones: [],
  consumos: [],
});

describe('ProduccionService.remove', () => {
  it('devuelve el consumo guardado aunque después haya cambiado la receta', async () => {
    const t = base();
    t.producciones.push({
      id: 7,
      productoId: 1,
      horneadas: 1,
      galletitasProducidas: 24,
    });
    // Se produjo con 1,5 kg de harina y 400 gr de manteca (la receta de ese momento).
    t.consumos.push(
      { id: 1, produccionId: 7, insumoId: 10, cantidad: 1.5 },
      { id: 2, produccionId: 7, insumoId: 11, cantidad: 400 },
    );
    const { service, tablas } = crearEntorno(t);

    const res = await service.remove(7);

    expect(res.segunRecetaActual).toBe(false);
    expect(tablas.insumos.find((i) => i.id === 10)!.stockActual).toBe(6.5);
    expect(tablas.insumos.find((i) => i.id === 11)!.stockActual).toBe(1400);
    expect(tablas.productos[0]!.stock).toBe(16);
    expect(tablas.producciones).toHaveLength(0);
    expect(tablas.consumos).toHaveLength(0);
    expect(res.galletitasDescontadas).toBe(24);
  });

  it('producción anterior a la tabla de consumos: devuelve según la receta actual × horneadas', async () => {
    const t = base();
    t.producciones.push({
      id: 8,
      productoId: 1,
      horneadas: 2,
      galletitasProducidas: 40,
    });
    const { service, tablas } = crearEntorno(t);

    const res = await service.remove(8);

    expect(res.segunRecetaActual).toBe(true);
    expect(res.devoluciones).toEqual([
      { insumoId: 10, cantidad: 4 },
      { insumoId: 11, cantidad: 1000 },
    ]);
    expect(tablas.insumos.find((i) => i.id === 10)!.stockActual).toBe(9);
    expect(tablas.insumos.find((i) => i.id === 11)!.stockActual).toBe(2000);
    expect(tablas.productos[0]!.stock).toBe(0);
  });

  it('bloquea si las cookies ya no están en stock (se vendieron) y no toca nada', async () => {
    const t = base();
    t.productos[0]!.stock = 4;
    t.producciones.push({
      id: 9,
      productoId: 1,
      horneadas: 1,
      galletitasProducidas: 24,
    });
    t.consumos.push({ id: 3, produccionId: 9, insumoId: 10, cantidad: 2 });
    const { service, tablas } = crearEntorno(t);

    await expect(service.remove(9)).rejects.toThrow(BadRequestException);
    await expect(service.remove(9)).rejects.toThrow(
      'se produjeron 24 Clásica y quedan 4 en stock',
    );
    expect(tablas.productos[0]!.stock).toBe(4);
    expect(tablas.insumos.find((i) => i.id === 10)!.stockActual).toBe(5);
    expect(tablas.producciones).toHaveLength(1);
    expect(tablas.consumos).toHaveLength(1);
  });

  it('con el stock justo igual a lo producido, permite eliminar y deja 0', async () => {
    const t = base();
    t.productos[0]!.stock = 24;
    t.producciones.push({
      id: 10,
      productoId: 1,
      horneadas: 1,
      galletitasProducidas: 24,
    });
    const { service, tablas } = crearEntorno(t);

    await service.remove(10);
    expect(tablas.productos[0]!.stock).toBe(0);
  });

  it('404 si la producción no existe', async () => {
    const { service } = crearEntorno(base());
    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});

describe('ProduccionService.create', () => {
  it('guarda el consumo real de cada insumo junto con la producción', async () => {
    const t = base();
    const { service, tablas } = crearEntorno(t);

    await service.create({ productoId: 1, horneadas: 2 } as never);

    expect(tablas.producciones).toHaveLength(1);
    const id = tablas.producciones[0]!.id;
    expect(
      tablas.consumos.map(
        ({ produccionId, insumoId, cantidad, precioPorUnidad }) => ({
          produccionId,
          insumoId,
          cantidad,
          precioPorUnidad,
        }),
      ),
    ).toEqual([
      { produccionId: id, insumoId: 10, cantidad: 4, precioPorUnidad: 1200 },
      { produccionId: id, insumoId: 11, cantidad: 1000, precioPorUnidad: 9.5 },
    ]);
    // Y lo que se guardó es exactamente lo que se descontó.
    expect(tablas.insumos.find((i) => i.id === 10)!.stockActual).toBe(1);
    expect(tablas.insumos.find((i) => i.id === 11)!.stockActual).toBe(0);
  });

  it('crear y después eliminar deja el stock como estaba', async () => {
    const t = base();
    const antes = JSON.stringify({
      insumos: t.insumos,
      productos: t.productos,
    });
    const { service, tablas } = crearEntorno(t);

    await service.create({ productoId: 1, horneadas: 1 } as never);
    await service.remove(tablas.producciones[0]!.id);

    expect(
      JSON.stringify({ insumos: tablas.insumos, productos: tablas.productos }),
    ).toBe(antes);
  });
});
