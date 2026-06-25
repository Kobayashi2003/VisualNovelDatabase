<div align="center">

# 🌸 Visual Novel Database 🌸

*A self-hosted, re-imagined clone of [vndb.org](https://vndb.org/), built on the [VNDB Kana API](https://api.vndb.org/kana).*

</div>

---

## Overview

This project mirrors the data behind [vndb.org](https://vndb.org/) into a **local database**, wraps it
in a set of small Flask services, and serves it through a **freshly redesigned Next.js frontend**.
On top of the original VNDB feature set it adds **user accounts**, **localized images & media**, and
a **Japanese translation layer** for tag/trait descriptions.

## Backend

A handful of focused Flask apps, orchestrated by a single launcher and fronted by Caddy.

| App | Purpose |
| --- | --- |
| **vndb** | Core API. Crawls the Kana API into local Postgres and serves VNs, releases, producers, characters, staff, tags & traits, plus search (local / remote / both). |
| **imgserve** | Localizes and serves images (covers, screenshots) with caching. |
| **userserve** | User accounts — registration, JWT auth, email, and personal collections/lists. |
| **transserve** | Translation layer — stores and serves en→ja translations of tag/trait descriptions. |
| **musicserve** | Serves the local music library for the player. |
| **procserve** | Process supervisor used by the launcher to start/manage all services. |

## Frontend

A single Next.js app. Most browsing flows through one catch-all route.

| Route | Shows |
| --- | --- |
| `/` | Home — recent releases by year/month. |
| `/[type]` (`v r p c s g i`) | Search results for VNs, releases, producers, characters, staff, tags, traits. |
| `/[type][id]` (e.g. `/v17`) | Detail page for a single entity. |
| `/[type][id]/rg` | Relation graph for a visual novel. |
| `/u/c` | User collections — browse, search, sort & bulk-edit marked items. |
| `/kobayashi` | A bespoke, music-player showcase of a user's VN collection. |
| `/reset-password` | Password reset. |

## Running

### Backend — Python 3.13 via [Pixi](https://pixi.sh/) (Flask · Celery · Redis · Postgres · Caddy)

```bash
cd backend
pixi install        # first-time setup
pixi run dev        # dev server   (or: pixi run prod)
```

> Requires a system **PostgreSQL**, **Redis**, and **Caddy** on PATH.
> Copy `.env.sample` → `.env` and adjust before first run.

### Frontend — Next.js 16 / React 19

```bash
cd frontend
npm install
npm run dev         # http://localhost:5010   (or: npm run build && npm run start)
```

## Acknowledgements

Heartfelt thanks to the **[VNDB](https://vndb.org/)** team and the **[Kana API](https://api.vndb.org/kana)**
developers, and to every contributor who has added and maintained the content on VNDB — this project would
not exist without their work.
