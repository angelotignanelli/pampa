# Pampa

Plataforma de gestión ganadera: pesajes, alimentación, sanidad y rentabilidad por
categoría de animal (novillo, vaca, ternero). Versión evolucionada de los bocetos —
ya es una app real con base de datos, no HTML estático.

## Stack

- **Next.js 16** (App Router, React 19, server components) + **TypeScript**
- **Prisma 6** ORM
- **SQLite** en local (para correr sin infra). En producción: cambiar el datasource a
  PostgreSQL y los `Float` de dinero a `Decimal`.
- **Tailwind v4** + sistema de diseño propio en `globals.css`

## Cómo correr

```bash
npm install
npx prisma migrate dev   # crea la base y aplica migraciones
npm run seed             # carga datos sintéticos (3 lotes, 74 animales, 296 pesajes)
npm run dev              # http://localhost:3000
```

Para reiniciar la base con datos frescos: `npm run db:reset`.

### Usuarios de demo (contraseña `campo1234`)

| Email | Rol |
|-------|-----|
| juan@laesperanza.ar | Dueño |
| marcos@laesperanza.ar | Encargado |
| luis@laesperanza.ar | Peón |

El peón puede cargar datos pero no crear lotes. Configurá `AUTH_SECRET` en `.env`
(ya se genera uno al primer build).

## Estructura

```
prisma/
  schema.prisma     # modelo de datos: Farm, Paddock, Lot, Animal, Weighing,
                    # Ration, RationItem, FeedIngredient, Treatment, Movement, User
  seed.ts           # generador de datos sintéticos determinístico
src/
  lib/
    domain.ts       # constantes y fórmulas (GDP, conversión, MS, costo/kg, etc.)
    queries.ts      # consultas + cálculos derivados por categoría
    prisma.ts       # singleton del cliente
    cat.ts          # parseo del filtro y formateadores
  components/
    Shell.tsx       # cabecera + filtro de categoría + menú lateral
    WeightChart.tsx # curva de peso con proyección (SVG)
    icons.tsx       # íconos SVG inline
  app/
    page.tsx        # Resumen
    pesajes/        # Pesajes (GDP por animal)
    alimentacion/   # Receta del mixer + aporte nutricional
    sanidad/        # Calendario sanitario
    economia/       # Rentabilidad por lote
    lotes/          # Inventario de hacienda
```

## Filtro por categoría

Es global y se propaga por URL (`?cat=STEER|COW|CALF`), así persiste al navegar entre
pestañas. Las métricas de engorde (conversión, costo/kg, margen) se muestran como "—"
para vacas de cría, porque no aplican.

## Funciona

- **Autenticación** con sesión por cookie firmada (HMAC) + roles (dueño / encargado / peón).
- **Carga de datos real** (server actions): pesajes, lotes, animales, raciones,
  tratamientos y movimientos. Las pantallas se recalculan al guardar.
- **Filtro por categoría** global, persistido por URL.
- **PWA** instalable con service worker (cachea el shell para lectura offline).

## Pendiente / próximas fases

- Edición y borrado de registros (hoy es alta + listado).
- Sincronización offline de **escrituras** (cola de mutaciones) — el SW hoy solo cachea lectura.
- Importador del Excel existente.
- Integraciones de hardware: balanza por bluetooth, lector de chip/RFID.
- Íconos PNG para la PWA (hoy usa SVG) y migración a PostgreSQL para producción.
