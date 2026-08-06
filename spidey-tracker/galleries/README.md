# City galleries

Put photos in a folder named:

```
<city>__<country>
```

Rules:
- lowercase
- spaces → `-`
- city and country separated by `__` (two underscores)

Examples (already created empty):

| Place | Folder |
|-------|--------|
| New York, USA | `new-york__usa/` |
| Rio de Janeiro, Brazil | `rio-de-janeiro__brazil/` |
| Mexico City, Mexico | `mexico-city__mexico/` |

Supported: `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif`  
Sorted by filename (`01.jpg`, `02.jpg`, …).

After adding or removing images, the dev server reloads the gallery list automatically.
Empty folders still show placeholder tiles.
