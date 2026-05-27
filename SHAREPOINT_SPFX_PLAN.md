# Calendario Promos en SharePoint

## Sitio destino

Sitio:

```text
https://verssion.sharepoint.com/sites/CalendarioPromos
```

Carpeta donde hoy se subieron archivos:

```text
https://verssion.sharepoint.com/sites/CalendarioPromos/Documentos%20compartidos/CALENDARIO%20PROMOS
```

El objetivo final no es abrir un `.html` desde una biblioteca, sino publicar una pagina real de SharePoint:

```text
https://verssion.sharepoint.com/sites/CalendarioPromos/SitePages/Calendario-Promos.aspx
```

## Por que SPFx

SharePoint abre archivos HTML de bibliotecas como documentos o previews. Eso puede impedir que se carguen bien estilos, scripts y permisos de pagina. SPFx convierte el calendario en un web part oficial de SharePoint, insertable en una pagina moderna.

## Permisos necesarios

Para crear datos:

- Permiso de propietario o editor en `https://verssion.sharepoint.com/sites/CalendarioPromos`.
- Permiso para crear una lista llamada `Promociones`.

Para instalar la app:

- Acceso al App Catalog de SharePoint, normalmente por IT o admin Microsoft 365.
- Si no hay App Catalog, IT debe crearlo.

Para usar la app:

- Equipo comercial: lectura sobre la pagina y la lista.
- Admin promos: edicion sobre la lista `Promociones`.

## Lista SharePoint

Crear una lista llamada:

```text
Promociones
```

Columnas esperadas:

| Nombre interno | Tipo recomendado | Uso |
| --- | --- | --- |
| `Title` | Una linea de texto | Titulo de la promo |
| `StartDate` | Fecha | Fecha desde |
| `EndDate` | Fecha | Fecha hasta |
| `Country` | Opcion o texto | Argentina / Uruguay |
| `Channel` | Opcion o texto | Locales / Online |
| `Branches` | Una linea de texto | Sucursales o alcance |
| `LinkUrl` | Una linea de texto | Link a archivo/listado SharePoint |
| `Notes` | Varias lineas de texto | Comentarios |

## Flujo final

1. Crear lista `Promociones`.
2. Crear paquete SPFx `.sppkg`.
3. Subir `.sppkg` al App Catalog.
4. Aprobar/deployar la app.
5. Crear pagina `Calendario-Promos.aspx`.
6. Agregar web part `Calendario Promos`.
7. Publicar la pagina.
8. Compartir el link de la pagina con el equipo.

## Paquete generado

El paquete ya fue generado en:

```text
/Users/aguzman/Documents/Calendario Promos/calendario-promos-spfx/sharepoint/solution/calendario-promos-spfx.sppkg
```

Ese es el archivo que debe subir IT/Admin al App Catalog.

## Paso a paso para subirlo

### A. Crear la lista

1. Abrir `https://verssion.sharepoint.com/sites/CalendarioPromos`.
2. Click en `Nuevo`.
3. Elegir `Lista`.
4. Crear lista en blanco.
5. Nombre: `Promociones`.
6. Crear las columnas de la tabla anterior.
7. Dar permisos:
   - Equipo comercial: lectura.
   - Admin promos: edicion.

### B. Subir la app al App Catalog

Este paso lo hace alguien con permisos de administrador de SharePoint.

1. Entrar al SharePoint Admin Center.
2. Ir a `More features`.
3. Abrir `Apps`.
4. Entrar a `App Catalog`.
5. Abrir `Apps for SharePoint`.
6. Subir este archivo:

```text
/Users/aguzman/Documents/Calendario Promos/calendario-promos-spfx/sharepoint/solution/calendario-promos-spfx.sppkg
```

7. Cuando SharePoint pregunte si se quiere deployar la solucion, aceptar.
8. Como el paquete esta marcado con `skipFeatureDeployment`, puede quedar disponible para todos los sitios del tenant si IT lo aprueba asi.

### C. Crear la pagina final

1. Abrir `https://verssion.sharepoint.com/sites/CalendarioPromos`.
2. Ir a `Nuevo`.
3. Elegir `Pagina`.
4. Nombre sugerido: `Calendario Promos`.
5. Editar la pagina.
6. Click en `+` para agregar web part.
7. Buscar `CalendarioPromos` o `Calendario Promos`.
8. Insertar el web part.
9. Publicar la pagina.

El link final deberia quedar parecido a:

```text
https://verssion.sharepoint.com/sites/CalendarioPromos/SitePages/Calendario-Promos.aspx
```

### D. Validar

1. Abrir la pagina publicada.
2. Confirmar que aparece el calendario.
3. Crear un item manual en la lista `Promociones`.
4. Recargar la pagina y verificar que se vea en el mes correspondiente.
5. Probar `Admin` con:
   - Usuario: `admin`
   - Contraseña: `promos2026`
6. Cargar una promo desde el panel.
7. Revisar que aparezca como item nuevo en la lista `Promociones`.

## Comandos esperados para desarrollo

Con Node compatible y el proyecto SPFx creado:

```bash
npm install
gulp build
gulp bundle --ship
gulp package-solution --ship
```

El paquete queda en:

```text
sharepoint/solution/calendario-promos.sppkg
```

## Nota sobre Node

La maquina actual tiene Node `18.13.0`. Las versiones SPFx modernas requieren Node mas nuevo. Para evitar problemas, lo ideal es usar Node LTS actual segun la version SPFx elegida por Microsoft, o al menos actualizar Node 18 a `18.17.1+` si se usa SPFx 1.18/1.20.
