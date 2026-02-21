# Expense Folders Implementation Plan

## Context

Add folders to group related expenses (e.g., "Trip to Paris"). Users can create folders with custom background images (uploaded from phone, stored in Azure Blob Storage), assign expenses to them, and view folder-scoped expenses/charts. Mobile-first.

## Key Design Decisions

- **Same Cosmos container** — folders stored alongside expenses with `type: "folder"` discriminator. No new container needed.
- **One-to-many** — each expense has an optional `folderId`. One expense belongs to at most one folder.
- **Azure Blob Storage for images** — photos compressed client-side (max 800px, JPEG quality 0.7), uploaded to backend, stored in Azure Blob. Folder document stores the blob URL. Fast serving, proper separation.
- **Context-dependent FAB** — adds expense in list/dashboard view, adds folder in folders view, shows mini-menu inside folder detail (new expense / add existing).
- **State-based navigation** — `activeFolderId` in ExpensesPage, no router needed.

## UI Flow

1. **Expenses page** — view toggle: list | dashboard | folders (3 icons in header)
2. **Folders view** — clean list of folder cards (name, thumbnail, expense count, total)
3. **Click folder** → FolderDetailView: full-page with background image, back arrow, category filters, expense list, dashboard — all scoped to that folder
4. **Create/edit folder** — bottom-sheet modal: name, description, image upload from phone
5. **Inside folder FAB** — mini-menu: "New Expense" (auto-assigned to folder) + "Add Existing" (picks from unassigned expenses)

---

## Phase 1: Backend

### 1.1 Add Blob Storage client to config.py and database/

- New env vars: `AZURE_STORAGE_CONNECTION_STRING` (or account name + key)
- New file `database/blob.py` — lazy-init BlobServiceClient, helper to upload/delete images
- Container name: `folder-images`, public read access (so frontend can load images directly via URL)

### 1.2 Update expense_routes.py

- Add `folderId: Optional[str] = None` to ExpenseCreate and ExpenseUpdate models
- Add `folder_id` query param to `GET /api/expenses` for filtering
- Add type filter to all expense queries: `(c.type = 'expense' OR NOT IS_DEFINED(c.type))`
- New expenses include `"type": "expense"` — backward compatible

### 1.3 Create folder_routes.py

Folder document schema:
```json
{
  "id": "fld_<ts>_<rand>",
  "userId": "fede",
  "type": "folder",
  "name": "Trip to Paris",
  "description": "...",
  "imageUrl": "https://<storage>.blob.core.windows.net/folder-images/fld_xxx.jpg",
  "createdAt": "2026-02-21T..."
}
```

Endpoints:
- `GET /api/folders` — list all folders (with expense count + total)
- `GET /api/folders/{id}` — single folder
- `POST /api/folders` — create (multipart: name, description, image file). Upload image to Blob, store returned URL in folder document.
- `PUT /api/folders/{id}` — update (multipart)
- `DELETE /api/folders/{id}` — delete folder + blob image. Unassign all expenses (remove folderId).
- `POST /api/folders/{id}/expenses` — assign expense IDs to folder
- `DELETE /api/folders/{id}/expenses/{expenseId}` — remove expense from folder

### 1.4 Register router in main.py

### 1.5 Add azure-storage-blob to requirements.txt

### 1.6 Create agents/tools/folders.py

4 tools: `create_folder`, `list_folders`, `add_expense_to_folder`, `query_folder_expenses`
(Voice can't upload images, so `create_folder` tool creates folder without image)

### 1.7 Update expenses_agent.py

- Add folder tools to `EXPENSE_TOOLS`
- Add folder instructions to system prompt

---

## Phase 2: Frontend — API & Helpers

### 2.1 Add folder methods to api.js

`getFolders`, `getFolder`, `createFolder` (multipart), `updateFolder` (multipart), `deleteFolder`, `assignExpensesToFolder`, `removeExpenseFromFolder`

Note: `createFolder` and `updateFolder` use FormData instead of JSON to handle file upload.

### 2.2 Create utils/imageCompressor.js

Helper: File → canvas resize (max 800px wide) → JPEG blob quality 0.7 → return compressed File. Reduces upload size before sending to backend.

---

## Phase 3: Frontend — Components

### 3.1 Create FolderCard/ component

- List card (similar style to ExpenseCard): small round thumbnail (image or fallback gradient), folder name, expense count, total
- onClick → enters folder, delete button

### 3.2 Create FolderModal/ component

- Bottom-sheet modal (same pattern as ExpenseModal)
- Fields: name (text), description (text), image upload (styled file input with preview)
- Compresses image before storing in form state

### 3.3 Create AddToFolderModal/ component

- Bottom-sheet listing unassigned expenses with checkboxes
- Each row: description, amount, date, category dot
- "Add Selected" confirm button

### 3.4 Update ExpenseModal/

- Add optional folder dropdown (shown when `folders` prop provided)
- Pre-select folder when editing an expense with `folderId`

### 3.5 Create FolderDetailView/ component

- Full page replacing ExpensesPage content when `activeFolderId` set
- Background: folder's `imageUrl` as fixed background with dark overlay
- Header: back arrow + folder name + total (over background image)
- Body: category filter + expense list or dashboard (reuses existing components, scoped to folder)
- FAB mini-menu: "New Expense" + "Add Existing"
- Expense cards have "remove from folder" action (unassigns, doesn't delete)

---

## Phase 4: Frontend — ExpensesPage Updates

### 4.1 Expand view toggle

`'list' | 'dashboard' | 'folders'` — add third folder icon

### 4.2 New state

`folders`, `activeFolderId`, `folderModalOpen`, `editingFolder`

### 4.3 Conditional rendering

- `activeFolderId !== null` → render FolderDetailView
- `view === 'folders'` → render folder card list + FAB creates folder
- `view === 'list'` / `'dashboard'` → existing behavior (pass folders to ExpenseModal)

---

## Files to Create

| File | Purpose |
|------|---------|
| `backend/app/database/blob.py` | Blob Storage client + upload/delete helpers |
| `backend/app/api/folder_routes.py` | Folder CRUD endpoints |
| `backend/app/agents/tools/folders.py` | Voice agent folder tools |
| `frontend/src/utils/imageCompressor.js` | Client-side image compression |
| `frontend/src/components/FolderCard/FolderCard.jsx` + `.css` | Folder list card |
| `frontend/src/components/FolderModal/FolderModal.jsx` + `.css` | Create/edit folder modal |
| `frontend/src/components/FolderDetailView/FolderDetailView.jsx` + `.css` | Folder detail page |
| `frontend/src/components/AddToFolderModal/AddToFolderModal.jsx` + `.css` | Assign existing expenses modal |

## Files to Modify

| File | Changes |
|------|---------|
| `backend/app/config.py` | Add Blob Storage env vars |
| `backend/app/api/expense_routes.py` | `folderId` support + type filter |
| `backend/app/main.py` | Register folder router |
| `backend/requirements.txt` | Add `azure-storage-blob` |
| `backend/app/agents/expenses_agent.py` | Add folder tools + prompt |
| `frontend/src/services/api.js` | Folder API methods (multipart for create/update) |
| `frontend/src/pages/ExpensesPage/ExpensesPage.jsx` + `.css` | 3-way view, folder state |
| `frontend/src/components/ExpenseModal/ExpenseModal.jsx` + `.css` | Folder picker |

---

## Backward Compatibility

No migration needed. Existing expenses (no `type`, no `folderId`) work as-is — queries use `(c.type = 'expense' OR NOT IS_DEFINED(c.type))`.

## Azure Setup Required

- Create a Blob Storage account (or use existing storage account)
- Create container `folder-images` with public read access
- Add `AZURE_STORAGE_CONNECTION_STRING` to backend App Service settings
- Add same to `.env` for local development
