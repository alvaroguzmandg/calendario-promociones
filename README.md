# Calendario de Promociones

Calendario comercial para ver y cargar promociones activas por rango de fechas. Incluye:

- Version estatica local/standalone para validar la experiencia rapidamente.
- Version SharePoint Framework (SPFx) lista para instalar como web part.
- Paquete `.sppkg` generado para publicar en SharePoint.

La vista muestra promociones en calendario mensual entre el 1 de enero de 2026 y el 31 de diciembre de 2030, con filtros por pais/canal, detalle en modal y carga desde panel admin.

Funciones principales:

- Crear promociones desde Admin.
- Editar promociones desde el pop-up de detalle, solo si Admin esta logueado.
- Mover promociones arrastrando la barra a otro dia, solo si Admin esta logueado.
- Guardar altas y ediciones via API en Vercel cuando hay Supabase/Redis configurado.

## Archivos principales

- `index.html`, `styles.css`, `app.js`: version estatica separada.
- `calendario-promos-standalone.html`: version estatica autocontenida.
- `api/promos.js`: API serverless para Vercel con persistencia en Redis REST compatible con Vercel KV / Upstash.
- `vercel.json`: configuracion de deploy Vercel.
- `calendario-promos-spfx/`: proyecto SharePoint Framework.
- `calendario-promos-spfx/sharepoint/solution/calendario-promos-spfx.sppkg`: paquete instalable.
- `SHAREPOINT_SPFX_PLAN.md`: paso a paso para publicar en SharePoint.

## Deploy en Vercel

La app puede correr en Vercel como herramienta web. Para que las promos sean compartidas entre usuarios, configurar una base compartida. La opcion recomendada si Redis/KV requiere plan pago es Supabase Free.

### Opcion recomendada: Supabase

Variables de entorno esperadas en Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Crear esta tabla en Supabase SQL Editor:

```sql
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  end_date date not null,
  country text not null,
  channel text not null,
  branches text,
  link_url text,
  notes text,
  created_at timestamptz not null default now()
);
```

### Opcion alternativa: Redis REST

Tambien se aceptan estas variables si se usa Vercel KV / Upstash:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Sin esas variables, la app carga en modo demo y no persiste promos compartidas.

Pasos:

1. Importar el repo `alvaroguzmandg/calendario-promociones` en Vercel.
2. Framework preset: `Other`.
3. Build command: vacio.
4. Output directory: vacio / raiz del proyecto.
5. Agregar las variables de entorno anteriores.
6. Deploy.

## Enfoque recomendado

La página no debería guardar una contraseña dentro del HTML. Lo más sólido es usar el login de Microsoft 365 y permisos de SharePoint:

- Equipo comercial: permiso de lectura sobre la página y la lista.
- Admins: permiso de edición sobre la lista `Promociones`.
- Archivos adjuntos/listados: hospedados en SharePoint y pegados como link en cada promo.

El MVP también incluye una compuerta simple para el botón Admin:

- Usuario: `admin`
- Contraseña: `promos2026`

Esto solo evita ediciones accidentales. No reemplaza los permisos reales de SharePoint, porque cualquier persona con conocimiento técnico podría inspeccionar el HTML/JS.

## Publicación

### Opción rápida: archivo autocontenido

Generar y subir `calendario-promos-standalone.html`. Este archivo tiene HTML, CSS y JS en un solo lugar, así evita que SharePoint pierda los estilos al abrir el archivo como vista previa.

Para regenerarlo después de cambios:

```bash
node scripts/build-standalone.mjs
```

Esta opción sirve para probar, pero depende de cómo el tenant de SharePoint trate los archivos `.html`.

### Opción recomendada: página SharePoint con web part

Para tener un link realmente prolijo, la versión final debería ser una página de SharePoint, por ejemplo:

```text
https://empresa.sharepoint.com/sites/comercial/SitePages/calendario-promos.aspx
```

La forma más estable es empaquetar esta app como un SharePoint Framework web part (SPFx). SPFx permite usar HTML, CSS y TypeScript/JavaScript dentro de páginas modernas de SharePoint y conectarse a listas del mismo sitio.

Ventajas:

- Link limpio de SharePoint.
- Login Microsoft 365 nativo.
- Permisos reales por grupo.
- Menos problemas con preview de archivos HTML.
- La app vive dentro de una página normal del sitio.

Requiere que un admin de Microsoft 365 habilite o use el App Catalog de SharePoint para instalar el paquete una vez.

### Lista de datos

1. Crear una Lista de SharePoint llamada `Promociones`.
2. Crear estas columnas con estos nombres internos:

| Campo visible | Tipo | Nombre interno esperado |
| --- | --- | --- |
| Título | Una línea de texto | `Title` |
| Desde | Fecha | `StartDate` |
| Hasta | Fecha | `EndDate` |
| País | Opción o texto | `Country` |
| Canal | Opción o texto | `Channel` |
| Sucursales / alcance | Varias líneas o texto | `Branches` |
| Link SharePoint | Una línea de texto | `LinkUrl` |
| Comentarios | Varias líneas de texto | `Notes` |

Conviene crear primero las columnas con el nombre técnico de la derecha y después renombrar el texto visible si se quiere mostrar "Desde", "Hasta", etc. SharePoint conserva el nombre interno original.

3. Subir `index.html`, `styles.css` y `app.js` a una biblioteca de documentos o a `Site Assets`.
4. Abrir `index.html` desde el mismo sitio de SharePoint donde vive la lista.

Para que funcione remoto:

- Si una persona no está logueada en Microsoft 365, SharePoint le va a pedir login.
- La app lee la lista `Promociones` con la sesión de esa persona.
- Cuando alguien carga una promo desde Admin, la app crea un ítem nuevo en esa misma lista.
- Si el usuario solo tiene permiso de lectura, podrá ver el calendario pero SharePoint rechazará el guardado.
- Los links a listados de productos pueden ser URLs de archivos o carpetas de SharePoint.

Si los nombres internos de columnas cambian, editá el objeto `SHAREPOINT_FIELDS` en `app.js`.

## Modo local

Al abrir `index.html` fuera de SharePoint, la app entra en modo demo con datos de ejemplo. Las cargas locales sirven solo para probar la interfaz; la persistencia compartida ocurre cuando la página corre dentro de SharePoint.
