# Tree Diameter Visualizer

This folder contains the complete local project: the React/Vite frontend, Express API, shared API types, tree algorithms, and workspace configuration.

## Requirements

- Windows 10 or 11
- Node.js 24.x
- pnpm 10.x
- Visual Studio Code

If pnpm is not installed, open PowerShell and run:

```powershell
npm install --global pnpm@10.26.1
```

## Open the project in VS Code

Extract the downloaded ZIP, open PowerShell in the extracted `tree-diameter-visualizer` folder, then run:

```powershell
code .
```

## Install dependencies

Run this once from the project root, where the root `package.json` and `pnpm-workspace.yaml` are located:

```powershell
pnpm install --frozen-lockfile
```

## Start the backend

Open a PowerShell terminal in VS Code at the project root.

**TERMINAL 1 — BACKEND (port 8080)**

```powershell
$env:PORT = "8080"
$env:NODE_ENV = "development"
pnpm --filter @workspace/api-server run dev
```

Keep this terminal running. The API is available at `http://localhost:8080`.

## Start the frontend

Open a second PowerShell terminal in VS Code at the project root.

**TERMINAL 2 — FRONTEND (port 5173)**

```powershell
$env:PORT = "5173"
$env:BASE_PATH = "/"
$env:API_URL = "http://localhost:8080"
pnpm --filter @workspace/tree-diameter-visualizer run dev
```

Keep this terminal running and open **http://localhost:5173** in your browser. The Vite development server proxies `/api` requests to the backend.

## Environment variables

| Variable | Process | Required | Value |
| --- | --- | --- | --- |
| `PORT` | Backend | Yes | `8080` |
| `PORT` | Frontend | Yes | `5173` |
| `BASE_PATH` | Frontend | Yes | `/` |
| `API_URL` | Frontend | No | API origin; defaults to `http://localhost:8080` |
| `NODE_ENV` | Backend | No | Set to `development` for local use |

No database, API key, or other secret is required to run the tree generation and diameter features locally.

## Verify the project

From the project root:

```powershell
pnpm run typecheck
$env:PORT = "5173"
$env:BASE_PATH = "/"
pnpm --filter @workspace/tree-diameter-visualizer run build
pnpm --filter @workspace/api-server run build
```

The frontend includes manual and random tree creation. The backend validates trees and computes and reconstructs the diameter with tree dynamic programming.