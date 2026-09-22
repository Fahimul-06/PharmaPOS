# PharmaPOS — MongoDB Production Rebuild

This project is a MongoDB/Mongoose rebuild of the supplied pharmacy POS frontend. The production-critical data path no longer uses Supabase or browser-side database writes.

## Included

- React + TypeScript + Vite frontend
- Node.js + Express REST API
- MongoDB + Mongoose
- HTTP-only JWT session cookie
- Role-based access control: Admin, Manager, Pharmacist, Cashier, Inventory
- Public self-registration removed
- Admin/staff account creation
- Medicine create/edit/activate/deactivate
- Bulk medicine CSV import (server parsed and validated)
- Batch inventory by branch
- Base-unit model with Box → Strip → Unit conversion
- FEFO sale allocation across multiple batches
- Expired medicine batches blocked from POS
- MongoDB transaction for sale + batch deductions + ledger + customer due + audit
- Stock receiving and audited stock adjustment
- Sales dashboard
- Sales/COGS/gross-profit reporting
- CSV sales export
- Audit logs
- Security middleware: Helmet, CORS, rate limiting, input validation, Mongo query sanitization

## Important inventory convention

Stock is stored in **base units** (tablet/capsule/piece).

Example:
- `stripsPerBox = 20`
- `unitsPerStrip = 10`
- 1 box = 200 base units

`purchasePrice`, `mrp`, `sellingPrice`, and batch `costPrice` are per base unit. POS automatically calculates strip and box prices from those values.

## 1. Configure environment

Copy:

```bash
cp .env.example .env
```

Set at minimum:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pharmapos?replicaSet=rs0
JWT_SECRET=use-a-long-random-secret-at-least-32-characters
ADMIN_NAME=Pharmacy Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeThisStrongPassword123!
CORS_ORIGINS=http://localhost:5173
PORT=4000
```

The bootstrap Admin is created only when that email does not already exist.

## 2. Start MongoDB as a replica set

MongoDB transactions are used for POS correctness. Use MongoDB Atlas in production, or start the included local replica set:

```bash
docker compose up -d mongodb mongo-init
```

For Atlas, replace `MONGODB_URI` with the Atlas connection string.

## 3. Install and run development

```bash
npm install
npm run dev:all
```

Frontend: `http://localhost:5173`
API: `http://localhost:4000/api`
Health: `http://localhost:4000/api/health`

## 4. Build and run production

```bash
npm install
npm run build
NODE_ENV=production npm start
```

In production Express serves the built React app from `dist/`, so UI and API can run on the same origin.

Or build the Docker image:

```bash
docker build -t pharmapos .
docker run --env-file .env -p 4000:4000 pharmapos
```

## Medicine import

Use **Upload Medicines** in the Admin sidebar. A sample file is in:

`sample-data/medicines.csv`

Required CSV columns:

- `brand_name`
- `generic_name`

Supported columns:

- `manufacturer`
- `category`
- `strength`
- `dosage_form`
- `barcode`
- `sku`
- `rack_location`
- `strips_per_box`
- `units_per_strip`
- `purchase_price`
- `mrp`
- `selling_price`
- `reorder_level`
- `description`

Upload limit: 5 MB / 5,000 medicine rows per request.

## Production checklist

Before real use:

1. Use MongoDB Atlas or a properly operated MongoDB replica set.
2. Use a strong `JWT_SECRET` from a secrets manager.
3. Set only the real frontend origin in `CORS_ORIGINS` if UI/API are split across origins.
4. Run behind HTTPS/TLS (Cloudflare, Nginx, Render, Fly, AWS, etc.).
5. Create database backups and test restoration.
6. Monitor disk, MongoDB connections, API latency, and application errors.
7. Do not expose MongoDB directly to the public internet.
8. Remove/rotate bootstrap Admin credentials after creating permanent administrator accounts.
9. Test barcode scanners and thermal-print layout on the actual POS devices.
10. Validate local pharmacy/tax/prescription regulatory requirements before production deployment.

## Verification performed in this rebuild

- Backend JavaScript files pass `node --check` syntax validation.
- Frontend TS/TSX files pass TypeScript parser/transpilation syntax validation.
- Full dependency installation/build could not be executed in the artifact environment because npm registry access was unavailable; run `npm install && npm run typecheck && npm run build` in a networked environment before deployment.
