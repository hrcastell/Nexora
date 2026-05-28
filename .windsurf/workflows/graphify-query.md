---
description: Consultar el grafo de conocimiento de Nexora con graphify
---

# Workflow: Consultar Grafo de Conocimiento

Este workflow te permite consultar el grafo de conocimiento del proyecto Nexora generado por graphify.

## Paso 1: Verificar que el grafo existe

```powershell
if (Test-Path "graphify-out/graph.json") {
    Write-Host "✓ Grafo de conocimiento encontrado"
} else {
    Write-Host "✗ No se encontró el grafo. Ejecuta /graphify-build primero"
    exit 1
}
```

## Paso 2: Consultar el grafo

Elige el tipo de consulta que necesitas:

### Consulta general (BFS - contexto amplio)
```powershell
$GRAPHIFY_PYTHON = Get-Content graphify-out\.graphify_python -Raw
$question = "tu pregunta aquí"
& $GRAPHIFY_PYTHON -c @"
import json
from networkx.readwrite import json_graph
import networkx as nx
from pathlib import Path

data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
G = json_graph.node_link_graph(data, edges='links')

question = '$question'
terms = [t.lower() for t in question.split() if len(t) > 3]

scored = []
for nid, ndata in G.nodes(data=True):
    label = ndata.get('label', '').lower()
    score = sum(1 for t in terms if t in label)
    if score > 0:
        scored.append((score, nid))
scored.sort(reverse=True)
start_nodes = [nid for _, nid in scored[:3]]

if not start_nodes:
    print('No se encontraron nodos para:', terms)
else:
    frontier = set(start_nodes)
    subgraph_nodes = set(start_nodes)
    for _ in range(3):
        next_frontier = set()
        for n in frontier:
            for neighbor in G.neighbors(n):
                if neighbor not in subgraph_nodes:
                    next_frontier.add(neighbor)
        subgraph_nodes.update(next_frontier)
        frontier = next_frontier
    
    print(f'Encontrados {len(subgraph_nodes)} nodos relacionados')
    for nid in list(subgraph_nodes)[:10]:
        d = G.nodes[nid]
        print(f'  - {d.get(\"label\", nid)} [{d.get(\"source_file\", \"\")}]')
"@
```

### Buscar camino entre dos conceptos
```powershell
$GRAPHIFY_PYTHON = Get-Content graphify-out\.graphify_python -Raw
$nodeA = "concepto A"
$nodeB = "concepto B"
& $GRAPHIFY_PYTHON -c @"
import json
import networkx as nx
from networkx.readwrite import json_graph
from pathlib import Path

data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
G = json_graph.node_link_graph(data, edges='links')

def find_node(term):
    term = term.lower()
    scored = sorted(
        [(sum(1 for w in term.split() if w in G.nodes[n].get('label','').lower()), n)
         for n in G.nodes()],
        reverse=True
    )
    return scored[0][1] if scored and scored[0][0] > 0 else None

src = find_node('$nodeA')
tgt = find_node('$nodeB')

if src and tgt:
    try:
        path = nx.shortest_path(G, src, tgt)
        print(f'Camino más corto ({len(path)-1} saltos):')
        for i, nid in enumerate(path):
            label = G.nodes[nid].get('label', nid)
            print(f'  {i+1}. {label}')
    except nx.NetworkXNoPath:
        print('No hay camino entre estos conceptos')
else:
    print('No se encontraron los nodos')
"@
```

## Paso 3: Ver el reporte completo

```powershell
Get-Content graphify-out/GRAPH_REPORT.md
```

## Paso 4: Abrir visualización HTML

```powershell
Start-Process graphify-out/graph.html
```

## Notas

- El grafo tiene **1111 nodos** y **1258 edges**
- Organizado en **113 comunidades**
- Incluye Backend, Frontend, Database, y documentación
- Los "God Nodes" más conectados son: `compilerOptions`, `resolveSchema()`, `Nexora Platform`
