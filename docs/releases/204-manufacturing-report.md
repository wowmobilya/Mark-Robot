# Release 204 manufacturing tickets

The manufacturing page turns a saved invoice into a workshop ticket by explicit request. Users can open the page directly or from an invoice card. Its chooser searches invoice numbers, customers, models, colors and ticket notes, and filters invoices by overall production progress. The interface and workshop printout support Arabic, Turkish, English, French and Russian.

## Ticket behavior

- Each invoice can have one versioned ticket. Creation reads the latest stored invoice inside an IndexedDB transaction. Repeated and concurrent creation requests retain the first ticket and its original capture time.
- Each sold line has its own identifier within the ticket. Its capture includes the saved product identifier, name, type, color, image, quantity, packets per unit and physical dimensions. Distinct colors and repeated lines retain their individual quantities and workshop instructions.
- The captured invoice number, customer, timestamp and original archive status stay with the ticket. Subsequent invoice or catalog changes preserve the captured details. A legacy invoice with unusable production quantities must be corrected before creating a ticket.
- Line status, notes and dated change history are saved together. Status corrections remain in the history. Concurrent edits to different lines or different fields merge. A conflicting update asks the operator to load the newest saved version and reconcile the local draft. Completing production changes only the ticket.
- Reloading a conflicted line checks for invoice changes while photos hydrate and rereads before publishing. A concurrent payment stays visible, and a deleted invoice is never restored by a stale read. A failed reread retains the operator's attempted note and the newest visible invoice.
- If an invoice with an unsaved workshop draft is deleted, the manufacturing page retains a notice identifying the invoice and line, shows the note in a read-only field for copying, and offers an explicit discard action in all five languages. Discarding the retained draft releases its update guard without writing or recreating an invoice.
- The A4 print preview uses the captured items and saved workshop notes. It waits for all supplied photos and document fonts. A blocked print window or unavailable asset displays an error. The preview stays open until the user closes it. Opening, printing and reprinting a ticket create no new work records.
- Update guards cover in-flight writes, unsaved line edits and the detached print preview. The invoice backup includes the nested manufacturing ticket, and the full-invoice edit merge helper preserves the current stored ticket while saving ordinary invoice edits.

## Verification

The two focused Node suites use the production calculation and page modules. Checks cover repeated creation, variant and dimension snapshots, archive provenance, status and note history, concurrent changes, write rejection and retry, stale invoice edits, updates during media hydration, five interface languages, popup blocking, image and font readiness, and protection of a detached print job.

Independent review reproduced and fixed the stale conflict-reload race and the inaccessible draft guard after invoice deletion. Three concurrency regressions failed before the fix; the recovery regression also failed before the retained-note notice was added. All 16 focused manufacturing tests passed afterward, including translated recovery, explicit discard, preservation of failed-save notes and proof that recovery makes no database writes. The review found no catalog backfill in historical captures and no additional verified image/font readiness blocker.

Run `node --test tests/manufacturing-core.test.cjs tests/manufacturing-workspace.test.cjs` for the focused checks. Native print-dialog output on a physical printer is outside their scope.
