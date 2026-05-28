---
description: Construir o actualizar el grafo de conocimiento de Nexora
---

# Workflow: Construir/Actualizar Grafo de Conocimiento

Este workflow construye o actualiza el grafo de conocimiento del proyecto usando graphify.

## Opción 1: Actualización incremental (recomendado)

Si ya existe un grafo y solo quieres actualizar archivos nuevos o modificados:

// turbo
```powershell
$GRAPHIFY_PYTHON = Get-Content graphify-out\.graphify_python -Raw -ErrorAction SilentlyContinue
if (-not $GRAPHIFY_PYTHON) {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv tool install --upgrade graphifyy -q
    } else {
        pip install graphifyy -q
    }
    $GRAPHIFY_PYTHON = (python -c "import sys; print(sys.executable)").Trim()
    $GRAPHIFY_PYTHON | Out-File -FilePath graphify-out\.graphify_python -Encoding utf8 -NoNewline
}

& $GRAPHIFY_PYTHON -m graphify . --update
```

## Opción 2: Reconstrucción completa

Para reconstruir todo el grafo desde cero:

```powershell
$GRAPHIFY_PYTHON = Get-Content graphify-out\.graphify_python -Raw -ErrorAction SilentlyContinue
if (-not $GRAPHIFY_PYTHON) {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv tool install --upgrade graphifyy -q
    } else {
        pip install graphifyy -q
    }
    $GRAPHIFY_PYTHON = (python -c "import sys; print(sys.executable)").Trim()
    $GRAPHIFY_PYTHON | Out-File -FilePath graphify-out\.graphify_python -Encoding utf8 -NoNewline
}

& $GRAPHIFY_PYTHON -m graphify .
```

## Opción 3: Solo re-clusterizar

Si solo quieres recalcular las comunidades sin re-extraer:

// turbo
```powershell
$GRAPHIFY_PYTHON = Get-Content graphify-out\.graphify_python -Raw
& $GRAPHIFY_PYTHON -m graphify . --cluster-only
```

## Qué genera graphify

Después de ejecutar, encontrarás en `graphify-out/`:

- **graph.json**: Grafo completo en formato JSON
- **graph.html**: Visualización interactiva
- **GRAPH_REPORT.md**: Reporte con comunidades, god nodes, conexiones sorprendentes
- **manifest.json**: Índice de archivos procesados
- **cache/**: Caché de extracción semántica

## Notas importantes

- La primera ejecución toma ~5-10 minutos (215 archivos, ~590k palabras)
- Las actualizaciones incrementales son mucho más rápidas
- Solo re-extrae archivos modificados o nuevos
- El grafo se actualiza automáticamente con cada cambio
