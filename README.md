# Pauta

App personal de seguimiento de una pauta nutricional por porciones y de la
recuperación de una operación de tobillo. Un solo usuario, uso diario desde un
iPhone, instalada como PWA.

El contexto del proyecto, las reglas de producto y las convenciones están en
[CLAUDE.md](CLAUDE.md).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test
npm run build
```

## Despliegue

Se importa en Vercel sin configuración adicional: no hay variables de entorno
todavía (Supabase entra en la tarea 2).
