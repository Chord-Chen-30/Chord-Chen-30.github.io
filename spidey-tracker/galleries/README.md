# City galleries

Put photos in the **source** project:

```
spidey-tracker-repro/public/galleries/<city>__<country>/
```

Rules:
- lowercase
- spaces → `-`
- city and country separated by `__` (two underscores)

Examples:

| Place | Folder |
|-------|--------|
| Miami, USA | `miami__usa/` |
| Key West, USA | `key-west__usa/` |
| New York, USA | `new-york__usa/` |
| Shanghai, China | `shanghai__china/` |

Supported in browser: `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif`  
(Not `.heic` — convert to jpg/png first.)

Sorted by filename (`01.jpg`, `02.jpg`, …).  
After adding images locally, restart/refresh the Vite app so the gallery list updates.  
To show on github.io: rebuild + push (copying only into the Pages repo is not enough for new filenames).
