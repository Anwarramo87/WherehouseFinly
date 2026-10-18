# Factory ERP Simplification — Design

Scope: three related simplifications of the Factory ERP.

- **Feature 1** — Smart `AddEditItemModal`: hide pricing/profit fields for non-finished products.
- **Feature 2** — Inventory page: type filter tabs + colored type badges.
- **Feature 3 (the heavy one)** — Link Purchase Order → Purchase Invoice with an edit-before-receive workflow, an auto-created draft invoice on PO send, a lock-on-match reconciliation, non-blocking shortage alerts, and a single (non-doubled) stock movement.

This document focuses the detailed design on Feature 3; Features 1 and 2 are well-specified UI changes that follow existing patterns and are documented briefly with the precedent they reuse.

---

## Technology stack (locked on approval)

- **Frontend**: Next.js (App Router, a *modified* build — see `front/Factory/AGENTS.md`), React, TanStack Query, Tailwind, `react-hot-toast`, Arabic RTL. Reusable WMS primitives in `@/components/wms/primitives.tsx` (`Panel`, `Button`, `Field`, `Pill`, `Stat`, `TableFrame`, `fmtMoney`, `fmtInt`, `fmtDate`, `inputClass`). API access via `@/lib/api-client` (axios). Navigation in App Router uses `useRouter` / `useSearchParams` from `next/navigation` (verified against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`).
- **Package manager / scripts (frontend)**: **npm** is canonical. CI (`.github/workflows/ci.yml`) uses `cache: npm`, `npm ci`, `npm run lint|typecheck|test|build`. `pnpm-lock.yaml` and `pnpm-workspace.yaml` exist but are legacy — leave them; do not switch. Verify with `npm run lint && npm run typecheck && npm run test && npm run build`.
- **Backend**: NestJS + **Prisma** at `back/werehouse/backend-nest` (note the nested `backend-nest` directory — `back/werehouse/package.json` does not exist). Migrations are timestamped folders under `prisma/migrations/`, applied via `node scripts/prisma-safe.js` (`prisma:migrate:local` / `prisma:migrate:deploy`). Multi-tenant via nullable `tenantId`. `DocumentStatus` enum: `DRAFT | POSTED | PARTIALLY_PAID | PAID | CANCELLED`.

No new dependencies are introduced.

---

## Feature 1 — Smart AddEditItemModal (brief)

File: `front/Factory/components/AddEditItemModal.tsx` (parent: `front/Factory/app/(dashboard)/inventory/page.tsx` `handleSaveItem`).

**Approach (follows the `QuickAddProductModal` precedent in `purchasing/page.tsx`, whose comment says a raw material is bought, not sold, so it is created without sale price).** The modal keeps a single form for all three `productType` values (`RAW_MATERIAL`, `SEMI_FINISHED`, `FINISHED`) but conditionally renders the pricing block.

Rendering rule (derive `isFinished = form.productType === "FINISHED"`):
- For **non-finished**: render **only** the `costPrice` field inside the "التسعير والربح" card; HIDE the `profitPercent` input, the `unitPrice` input, the three stat cards (unit profit / margin / cost-coverage), the margin progress bar, and the intro `<p>` that mentions profit / auto-calculated sale price. Keep the card header so the cost field has a home.
- For **FINISHED**: render everything as today.
- **State preservation**: do NOT clear `form.profitPercent` / `form.unitPrice` when switching to non-finished. Keep them in state so switching back to FINISHED restores what the user typed ("do not fabricate them" — they persist only if they were typed).

Payload rule (the stale-value guard the user asked for): in the modal `onSubmit`, build the saved payload from `form` and **omit** `profitPercent` and `unitPrice` (set to `undefined`) when `!isFinished`. This guarantees editing a finished item and switching it to raw never submits the old price/profit. Then call `onSave(payload, customFieldValues)`.

Parent compatibility — `inventory/page.tsx` `handleSaveItem` already destructures `profitPercent` out and re-adds it only when valid. Extend it to also drop `unitPrice` from `body` when `body.productType` is non-finished (defense in depth, so stale state never leaks even if the modal is bypassed). The existing finished-product save flow is unchanged.

**Authoritative invariant (backend, low-risk guard).** Non-finished products must never carry a sale price / profit. Enforce this in `InventoryService` (`back/.../src/inventory/inventory.service.ts`):
- `createProduct`: when `productType` is `RAW_MATERIAL`/`SEMI_FINISHED`, ignore any client-sent `unitPrice`/`profitPercent` and compute pricing from cost only — i.e. call `resolvePricing(costPrice, undefined, undefined)`, which yields `unitPrice = costPrice`, `profitPercent = 0`. (`Product.unitPrice` is non-nullable `Decimal(12,2)`, so it cannot be nulled; setting it to cost gives a zero-margin "at cost" sale price, which the inventory table renders as `—` for the profit column because `profitPercent === 0` and the derived margin is 0%.)
- `updateProduct`: same guard — when the resulting `productType` is non-finished, set `unitPrice = costPrice` and `profitPercent = 0`, ignoring sent `unitPrice`/`profitPercent`. This clears a stale sale price when an existing finished item is switched to raw (the frontend omits the values; the backend guarantees the clear, avoiding the `-100%` artifact that sending `unitPrice: 0` would produce via `resolvePricing`).

This guard is additive (only affects non-finished) and does not touch the finished-product save flow.

---

## Feature 2 — Type filter tabs + colored type badges (brief)

Files: `front/Factory/app/(dashboard)/inventory/page.tsx`; hook `front/Factory/hooks/useInventory.ts`; backend already supports it.

**Server-side filtering is available.** `useProducts` already accepts `productType?: string` and passes it to `/inventory/products`. The backend `InventoryProductsQueryDto` validates `@IsIn(['RAW_MATERIAL','SEMI_FINISHED','FINISHED'])` and `InventoryService.listProducts` applies `where.productType` (verified). So Feature 2 uses **server-side** filtering (unlike the stock-state filter, which is client-side by documented design).

Changes in `inventory/page.tsx`:
1. Add state `const [productType, setProductType] = useState<string>("all");` and pass `productType: productType === "all" ? undefined : productType` into `useInventory({...})`.
2. Add a new filter row immediately above the table (next to / above the existing stock-state pills). Tabs: `الكل | مواد خام | نصف نهائي | نهائي` mapping to `all | RAW_MATERIAL | SEMI_FINISHED | FINISHED`. **Style identically to the existing stock-state pills** — same `active ? "bg-[#1a2530] text-[#C89355] shadow-md" : "bg-white/70 ..."` treatment, same rounded-xl, same count-badge pattern. On change, `setProductType(value); setPage(1);`.
3. Reset page to 1 when the type filter changes (it changes the result set, like search/category do).

**Colored type badges — already implemented; no change needed.** The type column already renders colored pills with the exact tones requested: `RAW_MATERIAL` → `bg-amber-50 text-amber-700` "مادة خام"; `SEMI_FINISHED` → `bg-blue-50 text-blue-700` "نصف مصنّع"; `FINISHED` → `bg-emerald-50 text-emerald-700` "جاهز". (The task brief described this column as "plain text," but the current code already renders colored pills; F2's badge work is a no-op.) Keep these inline pills as-is rather than swapping to the shared `Pill` primitive, to avoid a visual regression on a page that uses a different pill idiom.

All existing functionality (search, category, stock filter, sort, pagination, CSV import/export, stat cards) stays intact. The type filter composes with the other filters because it is just another query param + the stock filter remains client-side on the returned page.

---

## Feature 3 — Link Purchase Order to Purchase Invoice (detailed)

### Current behavior (ground truth, verified)

- **PO states**: `draft → sent → received → cancelled`. Send = `PUT /purchasing/purchase-orders/{id}/status { status: 'sent' }` → `PurchasingService.changePurchaseOrderStatus` (a plain `prisma.purchaseOrder.update`, no side-effects, no actor today).
- **Receive** = `POST /purchasing/purchase-orders/{id}/receive` → `PurchasingService.receiveGoods`. Inside one `$transaction` it: increments each `PurchaseOrderItem.receivedQuantity`, creates a `GoodsReceipt`, sets PO status to `received` (all received) or stays `sent` (partial), calls `CostingService.applyInboundCost` (revalues weighted-average cost using the PO line `unitCost`), and calls `InventoryService.applyStockChangeWithin` (moves **plain** stock in `stock_levels`). Idempotent via a unique `receiptNumber`. **Stock moves here.** No batch is created on receive.
- **Invoice create** = `POST /purchasing/invoices` → `PurchaseInvoicesService.create`. The DTO already accepts `purchaseOrderId?` and per-item `purchaseOrderItemId?`; the schema already has `PurchaseInvoice.purchaseOrderId` (nullable, FK→`PurchaseOrder`, `onDelete: SetNull`) and `PurchaseInvoiceItem.purchaseOrderItemId` (nullable, **soft FK, no relation field on `PurchaseOrderItem`**). A `GET /purchasing/invoices/from-order/:id` (`fromPurchaseOrder`) pre-fills a payload from a PO using **received** quantities. There is also a `GET /purchasing/invoices/:id` (`get`) that already includes `purchaseOrder: { id, poNumber, status }`.
- **Invoice post** = `POST /purchasing/invoices/:id/post` → `PurchaseInvoicesService.post`. Per line it: allocates landed costs → `finalUnitCost`, calls `applyInboundCost` (revalues cost WITH quantity), then **either** `BatchesService.receiveIntoBatchWithin` (batch-tracked) **or** `applyStockChangeWithin` (plain) — both move stock — then for lines with `purchaseOrderItemId` it **increments PO `receivedQuantity` again** and moves the PO to `received`. So today, for a PO-linked invoice, stock and `receivedQuantity` are moved **twice** (once on receive, once on post). This is the double-count risk.
- **Stock ledgers**: `receiveIntoBatchWithin` writes `batch_stock_levels` AND calls `applyStockChangeWithin` (writes plain `stock_levels`). So plain `stock_levels` is the authoritative on-hand total; `batch_stock_levels` is the per-batch breakdown.
- **InvoiceDetail** (`purchasing/invoices/page.tsx`) renders items as a **read-only table**. There is no inline item-editing UI and `useUpdatePurchaseInvoice` is not called from the detail view. The only creation path is `CreateInvoiceModal` (manual). `addLandedCost` requires `DRAFT`; `addPayment` requires `POSTED` (throws on `DRAFT`).

### Decisions (the user already made these — not re-litigated)

Auto-create the linked invoice when a PO is sent (not a manual convert button). After receiving: 100% match → lock items; any mismatch → items stay editable + non-blocking shortage alerts; user confirms/locks manually after adjusting. Barcode scanning is future — manual only. Stock moves once.

### INVOICE CREATION ON PO SEND — backend side-effect (chosen)

**Recommendation: backend side-effect inside `changePurchaseOrderStatus`, run in the same Prisma transaction as the status update.** Justification:
- **Atomicity** — the PO status flip and the invoice creation succeed or fail together. Frontend orchestration (send → then createInvoice) leaves a sent PO with no invoice if the second call fails, and retries race on duplicates.
- **Idempotency is simplest here** — the handler can check "does a linked invoice already exist for this PO?" atomically, backed by a DB unique constraint (below). Re-sending (`sent → sent`) finds the existing invoice and skips. Frontend orchestration would need the same check but is racy.
- **Single source of truth** — "PO becomes sent" is the business event that births the invoice; any future path that sends a PO gets the invoice for free.

**Where it lives**: `PurchasingService.changePurchaseOrderStatus(purchaseOrderId, status, actor)` wraps its work in `this.prisma.$transaction(async (tx) => { const order = await tx.purchaseOrder.update({ where, data: { status }, include: { items, supplier } }); if (status === 'sent') { const inv = await this.purchaseInvoices.createLinkedDraftWithin(tx, order, actor); linkedInvoice = inv; } return order; })`. The controller `changeStatus` is updated to pass `@CurrentUser()` (the handler currently takes no actor; the auto-create needs `createdBy`). The response gains `linkedInvoice: { id, invoiceNumber } | null` (null if status wasn't `sent` or if a linked invoice already existed and was reused).

**New `PurchaseInvoicesService.createLinkedDraftWithin(tx, order, actor)`** (runs inside the caller's transaction, reuses existing transaction-friendly helpers `this.documentNumbers.next(tx, 'purchaseInvoice', tenantId)` and the private `recalculate(tx, id)` and `lineTotals`):
1. Idempotency: `const existing = await tx.purchaseInvoice.findFirst({ where: { purchaseOrderId: order.id } }); if (existing) return existing;`
2. Guard: if `order.items.length === 0`, skip (nothing to bill).
3. Generate `invoiceNumber` via `documentNumbers.next`.
4. Create the invoice + items in `tx`: header `{ invoiceNumber, supplierId: order.supplierId, purchaseOrderId: order.id, invoiceDate: today, dueDate: null, currency: 'SYP', createdBy: actor.userId, status: DRAFT, itemsLocked: false }`; items from `order.items` → `{ purchaseOrderItemId: item.id, sku: item.sku, quantity: item.quantity (ordered), unitCost: item.unitCost, discountPercent: item.discountPercent, taxRate: item.taxRate, location: 'WH-A' }` (no batch/expiry — added by the user later), each through `lineTotals`.
5. `return this.recalculate(tx, id)` (computes header totals).

To keep it DRY, extract the per-line create mapping (currently inline in `create` and `update`) into a private `buildItemCreateData(item)` helper used by `create`, `update`, and `createLinkedDraftWithin`. The manual `create` path is otherwise untouched.

**Idempotency — two layers**: (a) the in-handler `findFirst` check, and (b) a DB unique constraint on `purchaseOrderId` (see schema changes). The constraint is the hard backstop for concurrent sends.

### BACKEND SCHEMA CHANGES

**No new link columns are needed** — `PurchaseInvoice.purchaseOrderId` and `PurchaseInvoiceItem.purchaseOrderItemId` already exist. Two additions:

1. **`itemsLocked` on `PurchaseInvoice`** (stored flag, NOT derived). Add to the model:
   ```
   itemsLocked Boolean @default(false)
   ```
   **Why stored, not derived**: the user *explicitly* confirms/locks (an action maps cleanly to a stored flag), and it is trivial to gate `update`/`post` on a column. A purely derived lock ("every linked line qty === received and every PO item fully received") would also work for the auto-lock-on-receive case, but the explicit user confirm after a shortage (where the user edits quantities to match) is an action that should persist independently of re-derivation. We auto-SET the flag on a full-match receive and on an explicit lock; `update` and `post` read it. (Backlog: a derived view could be exposed for reporting later.)

2. **Unique constraint for idempotency** — one invoice per PO. Add to `PurchaseInvoice`:
   ```
   @@unique([purchaseOrderId])
   ```
   Postgres treats `NULL` as distinct in a unique index, so multiple direct invoices (`purchaseOrderId = null`) remain allowed, while at most one invoice can exist per non-null PO. `purchaseOrderId` is a globally-unique UUID PK on `PurchaseOrder`, so omitting `tenantId` from the constraint is correct and avoids the null-`tenantId` duplicate-allowed pitfall that `@@unique([tenantId, purchaseOrderId])` would have.

**Per-item ordered vs received — NO new columns.** Do not duplicate `orderedQuantity`/`receivedQuantity` onto `PurchaseInvoiceItem`. They already live on `PurchaseOrderItem` (`quantity`, `receivedQuantity`) and are reachable via the existing soft FK `purchaseOrderItemId`. The `get` endpoint joins them (below). Rationale: the PO is the source of truth for ordered/received; duplicating invites drift.

**Migration** (`prisma/migrations/<timestamp>_po_invoice_link_items_locked/migration.sql`), additive only:
```sql
ALTER TABLE "purchase_invoices" ADD COLUMN "itemsLocked" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "purchase_invoices_purchaseOrderId_key" ON "purchase_invoices"("purchaseOrderId");
```
No data backfill needed (default `false`; existing direct invoices keep null `purchaseOrderId`).

### BACKEND ENDPOINT CHANGES

**A. `changePurchaseOrderStatus`** — auto-create side-effect (above). Controller passes the actor; response includes `linkedInvoice`.

**B. `receiveGoods`** — after the existing `$transaction` commits and caches invalidate, call (best-effort, wrapped in try/catch + `Logger.warn`, never thrown to the client) `await this.purchaseInvoices.reconcileOnReceive(purchaseOrderId)`. This auto-locks a fully-matched linked draft invoice.

**C. New `PurchaseInvoicesService.reconcileOnReceive(purchaseOrderId)`** (best-effort, post-commit):
- Load the linked draft invoice: `findFirst({ where: { purchaseOrderId, status: DRAFT }, include: { items: true } })`; if none, return.
- Load the PO items (`{ id, quantity, receivedQuantity }`).
- Build a map `poItemById`. For each invoice line with a `purchaseOrderItemId`: `matched = line.quantity === poItem.receivedQuantity`.
- `allPoFullyReceived = poItems.every(i => i.receivedQuantity >= i.quantity)`.
- If `allPoFullyReceived && linkedLines.every(matched)` → `update({ where: { id }, data: { itemsLocked: true } })`. Else leave unlocked (the shortage UI handles the rest).
- Non-linked lines (extra lines the user added) are ignored by this check.

**D. New explicit lock endpoint** — `POST /purchasing/invoices/:id/lock` → `PurchaseInvoicesService.lock(invoiceId, actor)`:
- `findFirst({ where: { id }, include: { items: true } })`; require `status === DRAFT` (else `ConflictException`); require `purchaseOrderId` set (only PO-linked invoices can lock; else `BadRequestException`).
- Load PO items. For each invoice line with `purchaseOrderItemId`: if `line.quantity !== poItem.receivedQuantity`, collect a mismatch `{ sku, invoiceQty, receivedQty }`. If any mismatch → `ConflictException` listing them (the frontend pre-validates and shows non-blocking alerts; the backend is the authoritative gate).
- Else `update({ where: { id }, data: { itemsLocked: true } })`; audit; return the updated invoice.

**E. `get` (invoice detail)** — extend the `purchaseOrder` include so the frontend can derive per-line ordered/received and the lock state:
```
include: {
  supplier: true,
  items: { orderBy: { createdAt: 'asc' } },
  landedCosts: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'desc' } },
  purchaseOrder: { select: { id: true, poNumber: true, status: true,
    items: { select: { id: true, quantity: true, receivedQuantity: true, unitCost: true } } } },
}
```
`itemsLocked` is a scalar column returned automatically (the query uses `include`, not `select`). The frontend maps each invoice line to its PO item via `purchaseOrderItemId`.

**F. `update`** — add a lock guard at the top of `requireDraft`: if `invoice.itemsLocked`, throw `ConflictException('Items are locked; cannot edit lines. Cancel and re-issue or unlock.')`. Landed-cost add/remove also call `requireDraft` — they would be blocked by this. **So split the guard**: introduce `requireDraftAndEditable(invoiceId)` (draft AND `!itemsLocked`) for the item-replacing `update` path, and keep `requireDraft` (draft only) for landed-cost add/remove. This keeps landed costs available after lock (the user's requirement 4) while freezing line edits.

**G. `post` — the double-stock gating lives here.** Branch on `isPoLinked = Boolean(invoice.purchaseOrderId)`:

```
if (isPoLinked) {
  if (!invoice.itemsLocked) throw ConflictException('Lock items (match received) before posting a PO-linked invoice.');
}
// allocate landed costs → finalUnitCost per line; update each item (as today)
// load PO items once (by invoice.purchaseOrderId) into poItemById
for (const item of invoice.items) {
  if (item.purchaseOrderItemId && isPoLinked) {
    // PO-linked line: stock already moved on receive. Do NOT move stock.
    const po = poItemById.get(item.purchaseOrderItemId);
    const uplift = (finalUnitCost - Number(po.unitCost)) * item.quantity;
    await this.costing.applyCostAdjustment(tx, { sku: item.sku, upliftTotal: uplift, referenceType: 'purchase_invoice', referenceId: invoiceId, createdById: actor?.userId });
    if (product?.batchTracked || item.batchNumber) {
      await this.batches.receiveIntoBatchWithin(tx, { ..., moveStock: false }); // batch ledger only
    }
  } else {
    // extra (non-PO) line on a PO-linked invoice, OR a direct invoice line: move stock now (existing path)
    await this.costing.applyInboundCost(tx, { sku, quantityIn: item.quantity, unitCost: finalUnitCost, ... });
    if (batch) await this.batches.receiveIntoBatchWithin(tx, { ..., moveStock: true });
    else await this.inventory.applyStockChangeWithin(tx, { sku, location, change: item.quantity, ... });
  }
}
if (!isPoLinked) {
  // existing PO catch-up ONLY for direct invoices (legacy lines with purchaseOrderItemId): increment PO receivedQuantity + move PO to received
}
// ledger post (financials) — unchanged, runs for both paths
// set status POSTED — unchanged
```

Concretely, for **PO-linked** invoices `post`: allocates landed costs; revalues cost via a quantity-neutral uplift (NEW `CostingService.applyCostAdjustment`); creates the **batch ledger only** (NEW `moveStock: false` on `receiveIntoBatchWithin`) for batch-tracked lines; does **NOT** touch plain `stock_levels`, does **NOT** increment PO `receivedQuantity`, does **NOT** change PO status (receive owns all three); posts the ledger; sets `POSTED`. For **direct** invoices (`purchaseOrderId` null): unchanged from today (move stock + batches + cost-with-quantity + ledger), and the legacy PO catch-up block still runs for any stray `purchaseOrderItemId` lines.

**H. `addPayment` — broaden to allow payments on a locked PO-linked draft.** The user's requirement 4 says payments are available after lock. The existing flow requires `POSTED`. Change the guard to allow payment when `status in (POSTED, PARTIALLY_PAID, PAID)` **or** `(status === DRAFT && itemsLocked && purchaseOrderId)`. Payments are just recorded (`PurchasePayment` + `recalculate`); no ledger entry is written until `post`, so this is low-risk and additive. `recalculate` only promotes `DRAFT→PAID/PARTIALLY_PAID` for non-draft statuses, so a locked draft with payments stays `DRAFT` with `paidAmount` set, then `post` recomputes the final status. (If the review prefers the strict reading — "existing flows keep working" = pay only after post — this is the single point to revert; it is additive and isolated.)

**I. `listPurchaseOrders`** (PO page) — extend the `include` with `purchaseInvoices: { select: { id: true, status: true, itemsLocked: true }, take: 1, orderBy: { createdAt: 'desc' } }` so the PO row can show a "عرض الفاتورة" link to the auto-created invoice. (The unique constraint means at most one; `take: 1` is defensive.)

**J. `cancel`** — no change required for the gating. Note: a locked draft that is cancelled uses the existing draft-cancel branch (sets `CANCELLED`, no stock reversal since PO-linked post moves no stock). The receive-side stock is unaffected by invoice cancellation (correct — the goods are real).

### Cost revaluation method (NEW `CostingService.applyCostAdjustment`)

`applyInboundCost` revalues the weighted average as `(onHand·oldCost + qtyIn·incomingCost) / (onHand + qtyIn)` — it adds quantity. For a PO-linked invoice the goods already landed on receive, so re-running it would double-count the quantity in the denominator. Add a quantity-neutral revaluation:

```
async applyCostAdjustment(tx, { sku, upliftTotal, referenceType, referenceId, createdById }) {
  const uplift = D(upliftTotal);
  if (uplift.isZero()) return null;
  const product = await tx.product.findFirst({ where: { sku }, select: { sku, costPrice, costingMethod } });
  if (!product) return null;
  const onHand = max(0, sum(stockLevel.quantity for sku));   // read BEFORE any change
  const oldCost = D(product.costPrice);
  let newCost;
  switch (product.costingMethod) {
    case WEIGHTED_AVERAGE:
      newCost = onHand > 0 ? oldCost.mul(onHand).plus(uplift).div(onHand).toDP(4) : oldCost;
      break;
    case LAST_COST:
      newCost = onHand > 0 ? oldCost.plus(uplift.div(onHand)).toDP(4) : oldCost;
      break;
    case STANDARD:
      newCost = oldCost; // finance-owned; variance shows in history only
      break;
  }
  if (!newCost.equals(oldCost)) await tx.product.updateMany({ where: { sku }, data: { costPrice: newCost } });
  await tx.costHistory.create({ data: { sku, method, oldCost, newCost, oldQuantity: onHand, quantityIn: 0, incomingCost: uplift, referenceType, referenceId, createdById } });
  return { sku, oldCost, newCost, oldQuantity: onHand };
}
```

`uplift = (finalUnitCost − provisionalPOUnitCost) · quantity` where `provisionalPOUnitCost = poItem.unitCost` (the cost applied on receive). This absorbs both any unit-cost edit and the landed-cost share (since `finalUnitCost` includes it). If the user didn't edit cost and added no landed costs, `uplift = 0` → no-op. If `onHand` has dropped since receive (some sold), the variance spreads over current on-hand — the standard weighted-average approximation for a retroactive cost correction. The `costHistory` row records `quantityIn: 0` and the total `uplift` as `incomingCost` to distinguish it from a real receipt.

### Batches: `moveStock` flag (refactor, DRY)

`receiveIntoBatchWithin` currently writes `batch_stock_levels` AND calls `applyStockChangeWithin` (plain). Add an optional `moveStock?: boolean` (default `true`) to `ReceiveIntoBatchInput`; when `false`, skip the `applyStockChangeWithin` call (keep all batch-creation/blending logic). PO-linked invoice post calls it with `moveStock: false` so the batch ledger is created without re-moving plain stock (plain stock was moved on receive). This keeps batch-tracked PO-received goods correct (a batch exists with the right quantity/expiry) while preserving the single-stock-movement rule. Direct invoices and the existing batch flow pass `moveStock: true` (default) — unchanged behavior.

### FRONTEND RENDERING

Files: `hooks/useWms.ts`, `types/wms.ts`, `app/(dashboard)/purchasing/page.tsx`, `app/(dashboard)/purchasing/invoices/page.tsx`.

**Types (`types/wms.ts`)** — extend:
- `PurchaseInvoice`: add `itemsLocked: boolean`; widen `purchaseOrder` to `{ id; poNumber; status; items: Array<{ id; quantity; number; receivedQuantity: number; unitCost: Numeric }> } | null`.
- `PurchaseInvoiceItem`: add `purchaseOrderItemId: string | null` (currently absent).

**Hooks (`hooks/useWms.ts`)** — add:
- `useLockPurchaseInvoiceItems()` → `POST /purchasing/invoices/:id/lock` (reuse the `usePurchaseInvoiceMutation` factory, success text "تم إقفال بنود الفاتورة", fallback "فشل الإقفال"; it invalidates `queryKeys.purchasing.all` which covers the detail + list; no stock invalidation needed).
- `useChangePurchaseOrderStatus` already exists; its `onSuccess` invalidates `queryKeys.purchasing.all` (keep). The PO page reads the returned `linkedInvoice` via `mutateAsync`.
- `useReceivePurchaseOrder` already invalidates purchasing + inventory + stock (keep).

**PO page (`purchasing/page.tsx`)** — `SendOrderButton`:
- Use `mutateAsync`; on success, read `linkedInvoice?.id`; `router.push('/purchasing/invoices?open=<id>')` (auto-open the draft, bypassing `CreateInvoiceModal`). Import `useRouter` from `next/navigation`. Toast stays.
- Add a "عرض الفاتورة" button on each PO row when `order.purchaseInvoices?.[0]` exists (after send/receive), linking to the same route with `?open=`. This is how the user reaches the invoice after receiving.
- Update the footer text that falsely claims the invoice is auto-filled with received quantities — replace with: "عند إرسال الأمر تُنشأ فاتورة شراء مسودة مرتبطة تلقائياً، قابلة للتعديل حتى الاستلام." (Sending creates a linked draft invoice, editable until receiving.)
- The `ReceiveGoodsModal` is unchanged (it already receives remaining quantities with an idempotency key).

**Invoices page (`purchasing/invoices/page.tsx`)** — read the `open` query param on mount to open a specific invoice. Use `useSearchParams()` from `next/navigation`; per the Next doc, `useSearchParams` forces client rendering up to the nearest `Suspense` boundary during prerendering — wrap the param-reading in a small `<Suspense>` boundary (or read it in a child component) to avoid build warnings. On mount, if `open` is present, `setOpenId(open)`.

**`InvoiceDetail`** — the core changes. Compute, from `invoice`:
- `isPoLinked = Boolean(invoice.purchaseOrderId)`.
- `poItemById = new Map(invoice.purchaseOrder?.items?.map(i => [i.id, i]))`.
- per line: `po = poItemById.get(line.purchaseOrderItemId)`; `ordered = po?.quantity`; `received = po?.receivedQuantity`; `shortage = (ordered ?? 0) - (received ?? 0)`; `lineMatched = po ? line.quantity === received : true`.
- `allLinkedMatched = invoice.items.filter(has po).every(lineMatched)`; `hasShortage = invoice.items.some(l => shortage > 0)`.

**Render state pill** (next to the status `StatusPill`):
- `itemsLocked` → `Pill tone="green"` "بنود مطابقة ومقفلة".
- `!itemsLocked && isPoLinked && hasShortage` → `Pill tone="amber"` "فرق في الاستلام — راجع البنود".
- `!itemsLocked && isPoLinked && !hasShortage` → `Pill tone="blue"` "بانتظار الاستلام".

**Items panel — two modes:**
- **Editable** when `isDraft && !invoice.itemsLocked`: render an inline editable table (reuse the `CreateInvoiceModal` line-input pattern: inputs for `quantity`, `unitCost`, `discountPercent`, `taxRate`, `batchNumber`, `productionDate`, `expiryDate`, `location`, a remove button, and an "إضافة بند" button for **extra** non-PO lines). For PO-linked lines, `purchaseOrderItemId` is preserved on save; extra lines omit it. A "حفظ البنود" button builds the full items array and calls `useUpdatePurchaseInvoice({ invoiceId, items })` (the backend replaces all lines). Show the non-blocking shortage alert per linked line: a small inline amber row beneath the line — "مطلوب: {ordered}، مستلم: {received}، الفرق: {shortage} — عدّل الكمية لتطابق المستلم أو اضغط «مطابقة»." This alert does **not** disable save.
- **Read-only** when `!isDraft || invoice.itemsLocked`: the existing read-only table (unchanged), plus the per-line matched pill (`Pill tone="green"` "مطابق" when `lineMatched`).

**Confirm & lock** (PO-linked, editable mode): a "تأكيد التطابق وإقفال البنود" button. Behavior:
- If `allLinkedMatched` → call `useLockPurchaseInvoiceItems(invoiceId)`. On success the detail refetches (locked → read-only).
- If any mismatch → the button is disabled with a tooltip "عدّل الكميات لتطابق المستلم أولاً", and a secondary "مطابقة الكميات بالمستلم" button sets each linked line's `quantity` to `received` (via `useUpdatePurchaseInvoice`) then calls lock. (This gives the user the two paths they described: edit manually, or auto-match then confirm.)

**Post button** (existing "ترحيل الفاتورة"): for PO-linked invoices, disable it with a tooltip "أقفل البنود أولًا" while `!itemsLocked`; enable once locked. For direct invoices, no change. The existing confirm dialog stays.

**Landed costs panel**: unchanged logic — the form shows when `isDraft` (which is still true while locked), so landed costs remain addable after lock (requirement 4). The backend `requireDraft` (not the editable guard) gates it.

**Payments panel**: broaden the form's show-condition from `!isDraft && status !== CANCELLED && balance > 0` to also include `isDraft && itemsLocked && isPoLinked && balance > 0` (mirrors the backend `addPayment` broadening). Replace the "الدفعات تُسجَّل بعد ترحيل الفاتورة" note for locked drafts with the payment form. After `post` (POSTED), the existing condition keeps it available.

### MIGRATION SAFETY

- Prisma migration, additive only (above). New column `itemsLocked BOOLEAN NOT NULL DEFAULT false` — existing rows get `false`, no backfill. The unique index on `purchaseOrderId` allows multiple `NULL`s, so existing direct invoices are unaffected.
- **Pre-flight check**: confirm no existing rows have duplicate non-null `purchaseOrderId` before adding the unique index. The current UI never sets `purchaseOrderId` (`CreateInvoiceModal` doesn't send it; `fromPurchaseOrder` is only a GET prefill), so duplicates are not expected. If any exist, dedupe before the migration (keep the newest, null the rest) — include this as a guarded step in the migration SQL with a comment.
- Do NOT use `prisma:push:local --accept-data-loss` for this; use `prisma:migrate:local` so the migration is recorded. Run `npm run prisma:generate` after.
- Backend verification: `npm run typecheck` and `npm run test:unit` (jest) in `backend-nest`.

### DOUBLE-STOCK-MOVEMENT RULE (explicit)

**Stock moves exactly once per purchased unit.** For a PO-linked invoice, stock (and `receivedQuantity`, and PO status) move on **`PurchasingService.receiveGoods`** — the existing behavior, unchanged. The invoice `post` handler (`PurchaseInvoicesService.post`) is gated: for `invoice.purchaseOrderId` set, it does **not** call `applyStockChangeWithin`, does **not** call `receiveIntoBatchWithin` with `moveStock: true` (it uses `moveStock: false` for batch ledger only), does **not** increment PO `receivedQuantity`, and does **not** change PO status. It only revalues cost (`applyCostAdjustment`), creates the batch ledger for batch-tracked lines, posts the financial ledger, and sets `POSTED`. For a **direct** invoice (no `purchaseOrderId`), `post` moves stock as today (the goods arrive via the invoice, not a GRN). **The gating lives in `PurchaseInvoicesService.post`, branched on `Boolean(invoice.purchaseOrderId)`.**

### Error handling (concrete, per operation)

- **Auto-create on send**: failures are fatal to the send (same transaction) — a sent PO with no invoice is never persisted. `createLinkedDraftWithin` can fail on `documentNumbers.next` (rare) or a unique-constraint violation (concurrent send); the unique violation is caught and treated as idempotent (re-read the existing invoice and return it) so a concurrent double-send yields one invoice. Logged at `Logger.warn` with PO id.
- **`reconcileOnReceive` (auto-lock)**: best-effort, post-commit. Any failure is caught, logged at `warn`, and does **not** fail the receive (stock is already correct; the user can lock manually). Recoverable.
- **`lock`**: `NotFoundException` (no invoice), `ConflictException` (not draft / mismatched lines), `BadRequestException` (not PO-linked). Mismatches returned as a structured list so the frontend can toast specifics. Recoverable (user edits and retries).
- **`update` when locked**: `ConflictException` ("items locked"). Recoverable (cancel/re-issue).
- **`post` when PO-linked and not locked**: `ConflictException`. Recoverable (lock first). `post` when not draft: existing `ConflictException`.
- **`applyCostAdjustment`**: returns `null` (no-op) if `uplift` is zero or product/stock missing — never throws; cost stays at the provisional value. Non-fatal.
- **`addPayment` broadened**: same balance-exceed check; `ConflictException` if not in an allowed state. Recoverable.
- **Frontend**: all mutations go through the existing `usePurchaseInvoiceMutation` factory, which toasts errors via `react-hot-toast` and never leaves the UI in a broken state; queries use `keepPreviousData`.

### Input validation (concrete)

- `changePurchaseOrderStatus`: `status` must be in `['draft','sent','received','cancelled']` (existing `VALID_PO_STATUSES` check). Auto-create fires only for `'sent'`. Actor (userId) is required for `createdBy`.
- `createLinkedDraftWithin`: PO must have `items.length > 0` (else skip). Each invoice line `quantity = poItem.quantity > 0`, `unitCost = poItem.unitCost` (Decimal). No client input for this path (derived from the PO).
- `lock`: invoice must be `DRAFT` and `purchaseOrderId` non-null. Per-line `quantity` must equal `receivedQuantity` for linked lines.
- `post`: existing checks (draft, ≥1 line). PO-linked additionally requires `itemsLocked`.
- `applyCostAdjustment`: `upliftTotal` numeric; zero → no-op.
- Frontend editable line inputs: `quantity` integer ≥ 1; `unitCost` ≥ 0; `discountPercent`/`taxRate` 0–100; `batchNumber` ≤ 64 chars; `location` ≤ 120 chars. The backend DTO (`PurchaseInvoiceItemDto`) already enforces these.

### Invariants and ownership

- **"Non-finished products carry no sale price/profit"** — owned by `InventoryService.createProduct`/`updateProduct` (backend, authoritative); the frontend hides fields + omits payload as UX/defense.
- **"One invoice per PO"** — owned by the `@@unique([purchaseOrderId])` constraint (DB), with the handler's `findFirst` check as a fast path.
- **"Stock moves once"** — owned by `PurchaseInvoicesService.post` (the `isPoLinked` branch). `receiveGoods` is the single stock-mover for PO goods.
- **"Invoice lines are frozen once locked"** — owned by `requireDraftAndEditable` in the `update` path; `itemsLocked` is the flag.
- **"PO receivedQuantity and status are authoritative on receive"** — owned by `receiveGoods`; `post` does not touch them for PO-linked invoices.

### Testability

- **Unit (backend, jest `test:unit`)**:
  - `createLinkedDraftWithin` idempotency: calling twice returns the same invoice; a PO with no items skips.
  - `reconcileOnReceive`: full match → `itemsLocked=true`; partial → unchanged; no linked invoice → no-op.
  - `lock`: mismatched lines → `ConflictException` with the list; matched → `itemsLocked=true`; non-PO invoice → `BadRequestException`.
  - `post` gating: PO-linked + locked → no `applyStockChangeWithin`/`receiveIntoBatchWithin(moveStock)` calls, no PO `receivedQuantity` increment, `applyCostAdjustment` called with correct `uplift`; PO-linked + unlocked → `ConflictException`; direct invoice → existing stock moves occur.
  - `applyCostAdjustment`: zero uplift → no-op; weighted-average math on a fixture onHand/oldCost.
- **Integration (e2e, `test:e2e`)**: send PO → assert one draft invoice exists with ordered quantities and `itemsLocked=false`; receive full → invoice `itemsLocked=true`; receive partial → invoice stays editable, shortage present; lock with mismatch → 409; edit to match + lock → 200; post PO-linked → stock unchanged vs after receive, cost revalued, ledger entry exists; post direct → stock moved.
- **Frontend (vitest, where unit-testable)**: `InvoiceDetail` lock-state pill + shortage rendering given a fixture invoice; the editable/read-only mode switch on `itemsLocked`; the `SendOrderButton` navigation call (mock `router.push`). Component/integration flows (receive → lock → post) are manual/integration.

---

## Files to modify

**Frontend**
- `front/Factory/components/AddEditItemModal.tsx` — conditional pricing block + payload omission (F1).
- `front/Factory/app/(dashboard)/inventory/page.tsx` — type filter tabs + `productType` param; `handleSaveItem` strip `unitPrice` for non-finished (F1, F2).
- `front/Factory/types/wms.ts` — extend `PurchaseInvoice` (`itemsLocked`, PO items) and `PurchaseInvoiceItem` (`purchaseOrderItemId`) (F3).
- `front/Factory/hooks/useWms.ts` — add `useLockPurchaseInvoiceItems` (F3).
- `front/Factory/app/(dashboard)/purchasing/page.tsx` — `SendOrderButton` auto-open + PO-row invoice link + footer text fix (F3).
- `front/Factory/app/(dashboard)/purchasing/invoices/page.tsx` — `open` param; `InvoiceDetail` editable/locked modes, shortage alerts, confirm/lock, post gating, payment broadening (F3).

**Backend** (`back/werehouse/backend-nest`)
- `prisma/schema.prisma` — `itemsLocked` on `PurchaseInvoice`; `@@unique([purchaseOrderId])`.
- `prisma/migrations/<timestamp>_po_invoice_link_items_locked/migration.sql` — additive migration.
- `src/inventory/inventory.service.ts` — non-finished pricing guard in `createProduct`/`updateProduct` (F1).
- `src/purchasing/purchasing.module.ts` — import `PurchaseInvoicesModule`.
- `src/purchasing/purchasing.controller.ts` — pass `@CurrentUser()` to `changeStatus`.
- `src/purchasing/purchasing.service.ts` — `changePurchaseOrderStatus` auto-create (transactional) + return `linkedInvoice`; `receiveGoods` best-effort `reconcileOnReceive`.
- `src/purchase-invoices/purchase-invoices.service.ts` — `createLinkedDraftWithin`, `reconcileOnReceive`, `lock`; extend `get` include; split `requireDraft`/`requireDraftAndEditable`; `post` gating; `addPayment` broadening; shared `buildItemCreateData` helper.
- `src/purchase-invoices/purchase-invoices.controller.ts` — `POST :id/lock` route.
- `src/common/wms/costing.service.ts` — `applyCostAdjustment`.
- `src/batches/batches.service.ts` — `moveStock?` flag on `receiveIntoBatchWithin`/`ReceiveIntoBatchInput`.

---

## Out of scope

- Barcode scanning (explicitly future; the user said later). No scanning UI or stub.
- Splitting the inventory page into three pages (decided: one page + tabs + badges + smart form).
- HR pages (`employees`, `attendance`, `resigned`, `salaries`) — untouched.
- Auto-cancelling the linked draft invoice when a sent PO is cancelled (left to the user; the draft can be cancelled manually). Note as a future nicety.
- Reconciling provisional-vs-invoiced cost variance beyond the weighted-average uplift approximation (documented behavior; standard cost stays finance-owned).
- Removing the legacy `package-lock.json` / `pnpm-lock.yaml` duplication (npm is canonical via CI; cleanup is unrelated).
- Server actions / route handlers — not used; all data flows through the NestJS REST API via TanStack Query hooks, matching the existing pattern.
